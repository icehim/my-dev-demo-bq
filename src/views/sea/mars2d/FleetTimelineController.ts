/**
 * FleetTimelineController.ts
 * ============================================================
 * 全局时间轴控制器（多船统一时间驱动）
 *
 * 设计目标（非常重要）：
 * ------------------------------------------------------------
 * ✅ 只维护【一个】全局时间 globalCurrentTime
 * ✅ 只维护【一个】播放状态（play / pause / speed）
 * ✅ 所有船只（Mars2DTimeTrackPlayer）都被动接受时间：setGlobalTime(t)
 *
 * ❌ 单船播放器不允许“反向驱动”时间轴
 * ❌ 不允许用某一艘船的 currentTime 去更新 slider
 *
 * 这个类解决的问题：
 * ------------------------------------------------------------
 * - 多艘船时间范围不同，slider 回滚 / 跳变
 * - 拖动时间轴后点击播放会“滚回去”
 * - 某艘船到达 endTime 把全局时间拉回
 *
 * ============================================================
 */

import type { Mars2DTimeTrackPlayer } from './Mars2DTimeTrackPlayer';

export interface FleetTimelineOptions {
  startTime: number;
  endTime: number;
  speed?: number;
  players: Mars2DTimeTrackPlayer[];
}

export class FleetTimelineController {
  public currentTime: number;
  public speed: number;

  private startTime: number;
  private endTime: number;
  private players: Mars2DTimeTrackPlayer[];

  private playing = false;
  private rafId: number | null = null;
  private lastTs = 0;

  private onTimeCallbacks: Set<(t: number) => void> = new Set();

  constructor(options: FleetTimelineOptions) {
    this.startTime = options.startTime;
    this.endTime = options.endTime;
    this.players = options.players;
    this.speed = options.speed ?? 1;

    this.currentTime = this.startTime;

    // 初始化所有船
    this.players.forEach(p => p.setGlobalTime(this.currentTime));
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastTs = performance.now();
    // ✅ 恢复所有船的 AntPath 动画
    this.players.forEach(p => p.setExternalPlaying(true));
    this.loop();
  }

  pause() {
    this.playing = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    // ✅ 暂停所有船的 AntPath 动画
    this.players.forEach(p => p.setExternalPlaying(false));
  }

  setTime(t: number) {
    const tt = Math.max(this.startTime, Math.min(this.endTime, t));
    this.currentTime = tt;
    this.players.forEach(p => p.setGlobalTime(tt));
    this.emitTime();
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0, speed);
    this.players.forEach(p => p.setSpeedFactor(this.speed));
  }

  onTime(cb: (t: number) => void) {
    this.onTimeCallbacks.add(cb);
  }

  offTime(cb: (t: number) => void) {
    this.onTimeCallbacks.delete(cb);
  }

  private emitTime() {
    this.onTimeCallbacks.forEach(cb => cb(this.currentTime));
  }

  private loop = () => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;

    this.currentTime += dt * 1000 * this.speed;

    if (this.currentTime >= this.endTime) {
      this.currentTime = this.endTime;
      this.players.forEach(p => p.setGlobalTime(this.currentTime));
      this.emitTime();
      this.pause();
      return;
    }

    this.players.forEach(p => p.setGlobalTime(this.currentTime));
    this.emitTime();
    this.rafId = requestAnimationFrame(this.loop);
  };
}
