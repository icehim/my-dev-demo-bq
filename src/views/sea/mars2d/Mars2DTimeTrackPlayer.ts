/**
 * Mars2DTimeTrackPlayer.ts
 * ------------------------------------------------------------
 * 一个「时间轴驱动」的轨迹回放播放器（单目标/单船）。
 * 注意：
 * 本类不负责时间推进
 * 时间轴由 FleetTimelineController 统一管理
 *
 * ✅ 适用场景
 * - 后端返回：轨迹点 + 时间戳（例如 AIS / GPS 回放）
 * - 需要：播放/暂停/倍速/时间轴拖动（seek）
 * - 多目标同时回放：在业务层 new 多个实例，然后统一 setTime/start/pause
 *
 * ✅ 核心思想（非常重要）
 * - 不是“按速度（米/秒）走距离”，而是“按时间戳回放”
 * - 每一帧推进 currentTime：currentTime += dt * speedFactor
 * - 给定任意时间点 t，都能通过插值算出当前位置（lat/lng）
 *
 * ✅ 线条展示（本文件内实现）
 * - notPassedLine：整条航线（静态）——建议用淡色/虚线做背景（不更新几何）
 * - passedLine：已走过部分（动态）——可使用 AntPath 实现流动虚线
 *
 * ✅ 关于 AntPath 动画暂停
 * - 你的播放器暂停（RAF 停止）≠ AntPath 自动停
 * - AntPath 自己有动画时钟；必须显式 setStyle({paused:true/false})
 *
 * ------------------------------------------------------------
 * 依赖：
 * - mars2d（内部基于 Leaflet）
 */
import * as mars2d from 'mars2d';

/**
 * 单个轨迹点（必须带时间戳）
 * t：毫秒时间戳（UTC），推荐使用 Date.parse(ISO) 转换
 */
export interface TimedPoint {
  lat: number;
  lng: number;
  /** 毫秒时间戳（UTC） */
  t: number;
}

/**
 * 播放器配置项（业务层 new 的时候传入）
 *
 * 注意：
 * - speedFactor 是“时间倍速”：
 *   - speedFactor=1 ：真实时间回放
 *   - speedFactor=60：1秒真实时间 = 60秒轨迹时间（快进 1 分钟）
 *   - speedFactor=3600：1秒真实时间 = 1小时轨迹时间（快进 1 小时）
 */
export interface TimeTrackPlayerOptions {
  /** 时间倍速：1=真实速度，2=2倍速，10=10倍速 */
  speedFactor?: number;

  /** 是否播放时地图跟随（跟随会影响多船视角体验，一般只对“主船”开启） */
  panTo?: boolean;

  /** 是否让 marker 按航向自动旋转 */
  markerRotation?: boolean;

  /**
   * 旋转角度偏移：
   * - 不同图标默认朝向不同（有的朝上、有的朝右）
   * - 通过 offset 调整图标“船头”与真实航向对齐，例如 +90 或 -90
   */
  markerRotationOffset?: number;

  /** marker 样式（透传 mars2d Marker style） */
  markerStyle?: any;

  /** 轨迹线宽（基础宽度） */
  weight?: number;

  /** 已走线默认颜色（passedLineStyle 不写 color 时会用它） */
  passedLineColor?: string;

  /** 未走/背景线默认颜色（notPassedLineStyle 不写 color 时会用它） */
  notPassedLineColor?: string;

  /**
   * 已走线样式扩展：
   * - 如果 passedLine 用的是 AntPath，可在这里传 delay/dashArray/pulseColor/paused 等
   * - 也可以传 color/width/opacity/lineCap/lineJoin 等通用样式
   */
  passedLineStyle?: any;

  /**
   * 未走线样式扩展：
   * - 推荐只传 Polyline 支持的样式（color/width/opacity/dashArray/lineCap/lineJoin）
   * - ⚠️ 不要传 AntPath 专属参数（delay/pulseColor/paused），避免“污染”表现
   */
  notPassedLineStyle?: any;

  /** 可选：外部传入图层（如果不传，本类会自己 new GraphicLayer 并 add 到 map） */
  layer?: any;
}

/** 对外事件：业务层可监听，用于同步 UI（如时间轴 slider） */
type EventName = 'start' | 'pause' | 'finished' | 'time';
type Handler = (...args: any[]) => void;

/**
 * 一个极简事件系统（避免引入外部库）
 * - on/off/emit 三件套
 */
class Emitter {
  private m = new Map<EventName, Set<Handler>>();

  on(type: EventName, fn: Handler) {
    if (!this.m.has(type)) this.m.set(type, new Set());
    this.m.get(type)!.add(fn);
    return this;
  }

  off(type: EventName, fn?: Handler) {
    if (!this.m.has(type)) return this;
    if (!fn) this.m.delete(type);
    else this.m.get(type)!.delete(fn);
    return this;
  }

  protected emit(type: EventName, ...args: any[]) {
    const s = this.m.get(type);
    if (!s) return;
    s.forEach(fn => fn(...args));
  }
}

/**
 * 计算方位角（bearing）用于 marker 旋转（单位：度）
 * - 输入：两个经纬度点
 * - 输出：0~360（北为 0°，顺时针）
 */
function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Mars2DTimeTrackPlayer
 * ------------------------------------------------------------
 * 单目标时间轴播放器：
 * - new(map, points, options)
 * - start() / pause() / setSpeedFactor()
 * - setTime(t) 支持拖动到任意时间点
 */
export class Mars2DTimeTrackPlayer extends Emitter {
  /** 地图实例（mars2d.Map） */
  public readonly map: any;
  /** 图层：内部创建或外部传入 */
  public readonly layer: any;

  /** 船（或车辆）marker */
  public readonly marker: any;
  /** 已走线：建议用 AntPath（流动虚线） */
  public readonly passedLine: any;
  /** 未走/背景线：建议用 Polyline（静态虚线） */
  public readonly notPassedLine: any;

  /** 当前时间（ms，UTC） */
  public currentTime = 0;
  /** 当前实时位置（lat/lng）——用于 popup 等实时展示 */
  public currentPos: { lat: number; lng: number } = { lat: 0, lng: 0 };
  /** 当前落在哪一段 [i, i+1]（插值区间） */
  public currentIndex = 0;

  /** 轨迹点数组（按 t 升序） */
  private points: TimedPoint[];
  /** 合并后的配置（带默认值） */
  private options: Required<TimeTrackPlayerOptions>;

  /** 是否正在播放（RAF 是否在跑） */
  private playing = false;
  /** 上一次 RAF 的时间戳（performance.now） */
  private lastTs = 0;
  /** RAF id，用于 cancelAnimationFrame */
  private rafId: number | null = null;
  /*全局播放状态*/
  private externalPlaying = false;

  /** 回放区间 */
  public readonly startTime: number;
  public readonly endTime: number;

  constructor(
    map: any,
    points: TimedPoint[],
    options: TimeTrackPlayerOptions = {}
  ) {
    super();
    if (!map) throw new Error('map is required');
    if (!points || points.length < 2)
      throw new Error('points length must be >= 2');

    // 保险：按时间排序（后端一般已保证，这里让组件更健壮）
    this.points = [...points].sort((a, b) => a.t - b.t);

    this.map = map;
    this.startTime = this.points[0].t;
    this.endTime = this.points[this.points.length - 1].t;
    this.currentTime = this.startTime;
    this.currentPos = { lat: this.points[0].lat, lng: this.points[0].lng };

    // marker 默认样式（业务层可覆盖）
    const defaultMarkerStyle = {
      image: 'img/marker/ship.png',
      iconSize: [28, 28],
      horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
      verticalOrigin: mars2d.VerticalOrigin.CENTER
    };

    // 合并默认参数：因为 options 使用了 Required<>，所以每个字段都要有默认值
    this.options = {
      speedFactor: options.speedFactor ?? 60,
      panTo: options.panTo ?? false,
      markerRotation: options.markerRotation ?? true,
      markerRotationOffset: options.markerRotationOffset ?? 0,
      markerStyle: { ...defaultMarkerStyle, ...(options.markerStyle ?? {}) },
      weight: options.weight ?? 6,
      passedLineColor: options.passedLineColor ?? '#ec6137',
      notPassedLineColor: options.notPassedLineColor ?? '#00c2ff',
      passedLineStyle: options.passedLineStyle ?? {},
      notPassedLineStyle: options.notPassedLineStyle ?? {},
      layer: options.layer ?? null
    } as Required<TimeTrackPlayerOptions>;

    // 图层：如果外部没传，就内部创建，并 add 到地图
    this.layer = this.options.layer || new (mars2d as any).layer.GraphicLayer();
    if (!this.options.layer) map.addLayer(this.layer);

    // 全路径 latlngs（用于绘制底线/背景线）
    const latlngs = this.points.map(p => ({ lat: p.lat, lng: p.lng }));

    // 1) 未走/背景线：Polyline（静态虚线/淡色）
    //    ⚠️ 这个线建议不要在 applyTime 里每帧更新，否则看起来“会动”（几何缩短）。
    const notPassedStyleBase = {
      color: this.options.notPassedLineColor,
      width: this.options.weight,
      opacity: 0.35,
      dashArray: '8,8',
      // 取消圆角可用：lineCap: "butt", lineJoin: "miter"
      ...this.options.notPassedLineStyle
    };
    this.notPassedLine = new (mars2d as any).graphic.Polyline({
      latlngs,
      style: notPassedStyleBase
    });

    // 2) 已走线：AntPath（流动虚线）
    //    - 初始只包含起点
    //    - 默认 paused:true，避免“没点播放蚂蚁线也在动”
    const passedStyleBase = {
      color: this.options.passedLineColor,
      width: this.options.weight,
      opacity: 0.9,
      delay: 1000,
      dashArray: '10,20',
      pulseColor: '#ffffff',
      paused: true,
      // 取消圆角可用：lineCap: "butt", lineJoin: "miter"
      ...this.options.passedLineStyle
    };
    this.passedLine = new (mars2d as any).graphic.AntPath({
      latlngs: [latlngs[0]],
      style: passedStyleBase
    });

    // 3) marker：跟随时间变化 setLatLng
    this.marker = new (mars2d as any).graphic.Marker({
      latlng: latlngs[0],
      style: this.options.markerStyle
    });

    // 加入图层：背景线 -> 已走线 -> marker（确保已走线覆盖背景线）
    this.layer.addGraphic(this.notPassedLine);
    this.layer.addGraphic(this.passedLine);
    this.layer.addGraphic(this.marker);

    // 初始化到起始时间（会更新 marker 位置/旋转 & 已走线）
    this.setTime(this.startTime);
  }

  /**
   * 设置倍速（时间倍速）
   * - f=60：1 秒真实时间 = 60 秒轨迹时间
   */
  setSpeedFactor(f: number) {
    this.options.speedFactor = Math.max(0, Number(f) || 0);
  }

  /**
   * 跳到某个时间点（ms）
   * - 用于：时间轴拖动（seek）、“跳到事件点”等
   */
  setTime(t: number) {
    const tt = Math.max(
      this.startTime,
      Math.min(this.endTime, Number(t) || this.startTime)
    );
    this.currentTime = tt;
    this.applyTime(tt);
    this.emit('time', this.currentTime, this.currentPos, this.currentIndex);
  }
  setGlobalTime(t: number) {
    // 还没开始：停在起点，AntPath 停
    if (t <= this.startTime) {
      this.setTime(this.startTime);
      this.pausePathAnimation();
      return;
    }

    // 已结束：停在终点，AntPath 停
    if (t >= this.endTime) {
      this.setTime(this.endTime);
      this.pausePathAnimation();
      return;
    }

    // 行驶中：更新位置
    this.setTime(t);

    // ✅ 关键：只有“全局正在播放”才让 AntPath 动
    if (this.externalPlaying) this.resumePathAnimation();
    else this.pausePathAnimation();
  }

  /** 由全局控制器调用：告诉单船当前是否处于播放态 */
  setExternalPlaying(playing: boolean) {
    this.externalPlaying = playing;

    // 一旦全局暂停，立刻停 AntPath（防止拖动时被 setGlobalTime 恢复）
    if (!playing) this.pausePathAnimation();
  }

  /** 开始 AntPath 动画（不推进时间） */
  resumePathAnimation() {
    this.passedLine?.setStyle?.({ paused: false });
  }

  /** 暂停 AntPath 动画 */
  pausePathAnimation() {
    this.passedLine?.setStyle?.({ paused: true });
  }

  /** 回到起点 */
  reset() {
    this.setTime(this.startTime);
  }

  /**
   * 释放资源：
   * - 停止 RAF
   * - 从图层移除图形
   * - 如果图层是内部创建的，也从 map 移除
   */
  remove() {
    this.layer.removeGraphic(this.marker);
    this.layer.removeGraphic(this.passedLine);
    this.layer.removeGraphic(this.notPassedLine);
    if (!this.options.layer) this.map.removeLayer(this.layer);
  }

  /**
   * RAF 循环：
   * - dt（秒） = 当前帧与上一帧的时间差
   * - 推进轨迹时间：currentTime += dt * 1000 * speedFactor
   */
  private loop = () => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;

    const nextTime = this.currentTime + dt * 1000 * this.options.speedFactor;
    if (nextTime >= this.endTime) {
      this.setTime(this.endTime);
      this.playing = false;
      // 播放结束：停掉 AntPath（避免线还在动）
      this.passedLine?.setStyle?.({ paused: true });
      this.emit('finished');
      return;
    }

    this.setTime(nextTime);
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * 核心：给定时间 t，通过插值计算当前位置，并更新图形
   */
  private applyTime(t: number) {
    // 1) 定位 t 落在哪个点区间 [i, i+1]
    let i = this.currentIndex;
    if (t < this.points[i].t) i = 0;
    while (i < this.points.length - 2 && this.points[i + 1].t < t) i++;
    this.currentIndex = i;

    const a = this.points[i];
    const b = this.points[i + 1];

    // 2) 线性插值：ratio=0 在 a；ratio=1 在 b
    const span = Math.max(1, b.t - a.t);
    const ratio = Math.max(0, Math.min(1, (t - a.t) / span));

    const lat = a.lat + (b.lat - a.lat) * ratio;
    const lng = a.lng + (b.lng - a.lng) * ratio;
    const pos = { lat, lng };
    this.currentPos = pos;

    // 3) 更新 marker 位置
    this.marker.setLatLng(pos);

    // 4) marker 旋转（航向）
    if (this.options.markerRotation) {
      const deg = bearingDeg(a, b) + (this.options.markerRotationOffset ?? 0);
      // rotatedMarker 风格字段：rotationAngle/rotationOrigin
      this.marker.setStyle({
        rotationAngle: deg,
        rotationOrigin: 'center center'
      });
    }

    // 5) 更新已走线（增长）
    const base = this.points.map(p => ({ lat: p.lat, lng: p.lng }));
    const passed = base.slice(0, i + 1);
    passed.push(pos);
    this.passedLine.setLatLngs(passed);

    // ✅ 未走线（背景线）一般不要更新：
    // - 如果你想要“未走线从当前位置到终点逐渐缩短”，才需要 setLatLngs(notPassed)
    // - 如果你想要截图那种“未走线不动，已走线覆盖上去”，就保持不更新
    // const notPassed = [pos, ...base.slice(i + 1)]
    // this.notPassedLine.setLatLngs(notPassed)

    // 6) 地图联动（慎用：多船同时播放时会很晕）
    if (this.options.panTo) {
      this.map.setView(pos);
    }
  }
}
