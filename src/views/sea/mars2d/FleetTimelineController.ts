/**
 * FleetTimelineController.ts
 * ============================================================
 * 【全局时间轴控制器】
 *
 * 这是整套“轨迹回放系统”的时间中枢（Single Source of Truth）。
 *
 * 设计目标（非常重要，一定要看）：
 * ------------------------------------------------------------
 * 1️⃣ 全局只有【一个】时间 currentTime
 * 2️⃣ 全局只有【一个】播放状态（play / pause）
 * 3️⃣ 所有船只（Mars2DTimeTrackPlayer）【被动】接收时间
 *
 * ❌ 单艘船不允许：
 *   - 自己推进时间（requestAnimationFrame）
 *   - 反向驱动 UI（slider）
 *
 * ✅ 所有时间行为都必须经过这里：
 *   - 播放 / 暂停
 *   - 倍速
 *   - 时间轴拖动（seek）
 *
 * ------------------------------------------------------------
 * 这个类解决的问题：
 * - 多船时间范围不一致导致 slider 回滚
 * - 拖动时间轴后点击播放“跳回去”
 * - 某一艘船走完后影响全局时间
 *
 * 👉 即使只有一条船，这个 Controller 依然是必须的
 */

import type { Mars2DTimeTrackPlayer } from './Mars2DTimeTrackPlayer';

/**
 * FleetTimelineOptions
 * ------------------------------------------------------------
 * 构造函数参数说明
 */
export interface FleetTimelineOptions {
  /** 全局起始时间（毫秒时间戳，UTC） */
  startTime: number;

  /** 全局结束时间（毫秒时间戳，UTC） */
  endTime: number;

  /**
   * 时间倍速：
   * - 1    = 实时
   * - 60   = 1 秒真实时间 = 1 分钟轨迹时间
   * - 3600 = 1 秒真实时间 = 1 小时轨迹时间
   */
  speed?: number;

  /** 所有船只的播放器实例 */
  players: Mars2DTimeTrackPlayer[];
}

/**
 * FleetTimelineController
 * ------------------------------------------------------------
 * 全局时间轴控制器（核心类）
 */
export class FleetTimelineController {
  /** 当前全局时间（毫秒时间戳） */
  public currentTime: number;

  /** 当前时间倍速 */
  public speed: number;

  /** 全局起始时间 */
  private startTime: number;

  /** 全局结束时间 */
  private endTime: number;

  /** 所有船只实例 */
  private players: Mars2DTimeTrackPlayer[];

  /** 是否正在播放 */
  private playing = false;

  /** requestAnimationFrame id */
  private rafId: number | null = null;

  /** 上一帧的 performance.now() */
  private lastTs = 0;

  /**
   * 时间变化监听器集合
   * 用于：
   * - 驱动 el-slider
   * - 显示当前时间文本
   */
  private onTimeCallbacks: Set<(t: number) => void> = new Set();

  /**
   * 单艘船播放结束监听器集合
   * 用于：
   * - 某一艘船第一次播放到自身结束时间时触发
   * - 不等全部船只播放完
   * - 不会每一帧重复触发
   */
  private onPlayerEndCallbacks: Set<(player: Mars2DTimeTrackPlayer) => void> =
    new Set();

  /**
   * 已经触发过“单艘船播放结束”的船只集合
   * 用于防止同一艘船结束后，每一帧都重复触发结束事件
   */
  private finishedPlayerSet: Set<Mars2DTimeTrackPlayer> = new Set();

  constructor(options: FleetTimelineOptions) {
    this.startTime = options.startTime;
    this.endTime = options.endTime;
    this.players = options.players;
    this.speed = options.speed ?? 1;

    // 初始化当前时间为全局起始时间
    this.currentTime = this.startTime;

    // 初始化所有船只到起始时间
    this.updatePlayersByTime(this.currentTime);
  }

  /**
   * ▶️ 开始播放（全局）
   * ----------------------------------------------------------
   * - 启动全局 requestAnimationFrame
   * - 告诉每艘船：现在是“播放态”（用于 AntPath 动画）
   */
  play() {
    if (this.playing) return;

    this.playing = true;
    this.lastTs = performance.now();

    // 通知所有船只：进入播放态（AntPath 可以动）
    this.players.forEach(p => p.setExternalPlaying(true));

    this.loop();
  }

  /**
   * ⏸ 暂停播放（全局）
   * ----------------------------------------------------------
   * - 停止 requestAnimationFrame
   * - 告诉每艘船：进入暂停态（AntPath 必须停）
   */
  pause() {
    this.playing = false;

    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 通知所有船只：进入暂停态（AntPath 停止）
    this.players.forEach(p => p.setExternalPlaying(false));
  }

  /**
   * ⏩ 设置全局时间（seek）
   * ----------------------------------------------------------
   * 用于：
   * - 拖动时间轴
   * - 跳转到某个时间点
   */
  setTime(t: number) {
    // 防止越界
    const tt = Math.max(this.startTime, Math.min(this.endTime, t));
    this.currentTime = tt;

    /**
     * seek 后清空单船结束记录
     * --------------------------------------------------------
     * 作用：
     * - 用户把时间轴拖回前面后
     * - 再次播放到某艘船的结束时间
     * - 允许重新触发该船的结束事件
     */
    this.updatePlayersByTime(tt);
    // 通知 UI（slider / 时间显示）
    this.emitTime();
  }

  /**
   * ⚡ 设置时间倍速
   * ----------------------------------------------------------
   * 这里只控制“全局时间推进速度”
   */
  setSpeed(speed: number) {
    this.speed = Math.max(0, speed);

    // 同步给每艘船（用于内部计算）
    this.players.forEach(p => p.setSpeedFactor(this.speed));
  }

  /**
   * 注册时间变化监听
   * ----------------------------------------------------------
   * index.vue 会用它来驱动 el-slider
   */
  onTime(cb: (t: number) => void) {
    this.onTimeCallbacks.add(cb);
  }

  /** 移除时间监听 */
  offTime(cb: (t: number) => void) {
    this.onTimeCallbacks.delete(cb);
  }

  /**
   * 注册单艘船播放结束监听
   * ----------------------------------------------------------
   * 触发时机：
   * - 某一艘船第一次到达自身结束时间
   *
   * 注意：
   * - 不是每一帧触发
   * - 不是全部船只播放完成后触发
   * - 不会影响全局时间轴继续播放
   */
  onPlayerEnd(cb: (player: Mars2DTimeTrackPlayer) => void) {
    this.onPlayerEndCallbacks.add(cb);
  }

  /** 移除单艘船播放结束监听 */
  offPlayerEnd(cb: (player: Mars2DTimeTrackPlayer) => void) {
    this.onPlayerEndCallbacks.delete(cb);
  }

  /** 触发所有时间监听 */
  private emitTime() {
    this.onTimeCallbacks.forEach(cb => cb(this.currentTime));
  }

  /** 触发单艘船播放结束监听 */
  private emitPlayerEnd(player: Mars2DTimeTrackPlayer) {
    this.onPlayerEndCallbacks.forEach(cb => cb(player));
  }

  /**
   * 根据全局时间更新所有船只
   * ----------------------------------------------------------
   * 这里统一做两件事：
   * 1. 调用每艘船的 setGlobalTime(t)，保持原有位置更新逻辑
   * 2. 判断每艘船是否第一次播放到自身结束时间
   */
  private updatePlayersByTime(t: number) {
    this.players.forEach(player => {
      player.setGlobalTime(t);

      const endTime = player.getEndTime?.();

      if (typeof endTime !== 'number') return;

      /**
       * 如果当前时间小于该船结束时间
       * 说明时间轴已经回到这艘船结束之前
       * 此时允许它之后再次触发结束事件
       */
      if (t < endTime) {
        this.finishedPlayerSet.delete(player);
        return;
      }

      /**
       * 当前时间第一次到达或超过该船结束时间时触发
       */
      if (!this.finishedPlayerSet.has(player)) {
        this.finishedPlayerSet.add(player);
        this.emitPlayerEnd(player);
      }
    });
  }

  /**
   * requestAnimationFrame 循环
   * ----------------------------------------------------------
   * 每一帧：
   * - 根据 dt 和 speed 推进全局时间
   * - 驱动所有船只位置更新
   */
  private loop = () => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;

    // 推进全局时间
    this.currentTime += dt * 1000 * this.speed;

    // 到达终点：自动停
    if (this.currentTime >= this.endTime) {
      this.currentTime = this.endTime;
      this.updatePlayersByTime(this.currentTime);
      this.emitTime();
      this.pause();
      return;
    }

    // 正常推进
    this.updatePlayersByTime(this.currentTime);
    this.emitTime();

    this.rafId = requestAnimationFrame(this.loop);
  };
}
