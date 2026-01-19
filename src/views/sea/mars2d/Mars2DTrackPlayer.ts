/**
 * Mars2DTrackPlayer
 * -----------------
 * 这是一个【轨迹播放器核心类】，用于在 mars2d 中实现：
 * - marker 沿轨迹连续、匀速移动
 * - 支持播放 / 暂停 / 倍速 / 进度控制
 * - 支持多艘船同时回放
 *
 * 设计思想来源：
 * weijun-lab / Leaflet.TrackPlayer
 *
 * ⚠️ 注意：
 * - 这是“播放器”，不是简单动画
 * - marker 是固定对象，只更新位置（交互稳定）
 */

import * as mars2d from 'mars2d';

/* =========================
 * 基础类型定义
 * ========================= */

/**
 * 轨迹点类型
 * - 支持 {lat, lng}
 * - 也支持 [lat, lng]
 */
export type LatLngLike = { lat: number; lng: number } | [number, number];

/**
 * Marker 样式配置（透传给 mars2d.graphic.Marker）
 */
export interface MarkerStyle {
  image: string;
  iconSize?: [number, number];
  width?: number;
  height?: number;
  horizontalOrigin?: any;
  verticalOrigin?: any;
  rotation?: number;
  [key: string]: any;
}

/**
 * TrackPlayer 构造参数
 */
export interface TrackPlayerOptions {
  /** 运动速度（km/h，和 weijun-lab TrackPlayer 语义一致） */
  speed?: number;

  /** 轨迹线宽 */
  weight?: number;

  /** 已走过轨迹线颜色 */
  passedLineColor?: string;

  /** 未走轨迹线颜色 */
  notPassedLineColor?: string;

  /** 是否在运动时让地图跟随 */
  panTo?: boolean;

  /** 是否根据轨迹方向旋转 marker */
  markerRotation?: boolean;

  /** marker 旋转角度偏移 */
  markerRotationOffset?: number;

  /** marker 样式 */
  markerStyle?: MarkerStyle;

  /** 外部传入的 GraphicLayer（可选） */
  layer?: any;
}

/* =========================
 * 内部事件系统（轻量 EventEmitter）
 * ========================= */

type EventName = 'start' | 'pause' | 'progress' | 'finished';

/**
 * 事件基类
 * 用来给 TrackPlayer 提供 on / off / emit 能力
 */
class Emitter {
  private listeners = new Map<EventName, Set<Function>>();

  /** 注册事件 */
  on(type: EventName, fn: Function): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(fn);
    return this;
  }

  /** 注销事件 */
  off(type: EventName, fn?: Function): this {
    if (!this.listeners.has(type)) return this;
    if (!fn) {
      this.listeners.delete(type);
    } else {
      this.listeners.get(type)!.delete(fn);
    }
    return this;
  }

  /** 触发事件 */
  protected emit(type: EventName, ...args: any[]): void {
    const fns = this.listeners.get(type);
    if (!fns) return;
    fns.forEach(fn => fn(...args));
  }
}

/* =========================
 * 数学 / 工具函数
 * ========================= */

/**
 * 将 LatLngLike 统一转换为 {lat, lng}
 */
function normalizeLatLng(p: LatLngLike): { lat: number; lng: number } {
  return Array.isArray(p) ? { lat: p[0], lng: p[1] } : p;
}

/**
 * 计算两点之间的球面距离（米）
 */
function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * 计算从点 a 指向点 b 的方位角（0~360°）
 * 用于 marker 朝向
 */
function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
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

/* =========================
 * 核心类：Mars2DTrackPlayer
 * ========================= */

export class Mars2DTrackPlayer extends Emitter {
  /** 地图对象 */
  public readonly map: any;

  /** 使用的图层 */
  public readonly layer: any;

  /** 运动中的 marker（船 / 车） */
  public readonly marker: any;

  /** 已走过轨迹线 */
  public readonly passedLine: any;

  /** 未走轨迹线 */
  public readonly notPassedLine: any;

  /** 当前实时位置（对外暴露，便于点击弹窗） */
  public currentPos: { lat: number; lng: number };

  /** 当前所在轨迹段索引 */
  public currentIndex = 0;

  /* ===== 内部状态 ===== */

  private latlngs: { lat: number; lng: number }[] = [];
  private segmentLengths: number[] = []; // 每一段的长度
  private cumulativeLengths: number[] = []; // 累积长度
  private totalLength = 0; // 总轨迹长度（米）

  private playing = false; // 是否正在播放
  private speedKmh = 0; // 当前速度
  private progress01 = 0; // 播放进度 0~1
  private lastTimestamp = 0; // 上一帧时间戳
  private rafId: number | null = null; // requestAnimationFrame id

  /**
   * 构造函数
   */
  constructor(map: any, path: LatLngLike[], options: TrackPlayerOptions = {}) {
    super();

    if (!map) throw new Error('map is required');
    if (!path || path.length < 2) throw new Error('path length must be >= 2');

    this.map = map;

    /* ===== 参数合并 ===== */
    const defaultMarkerStyle: MarkerStyle = {
      image: 'img/marker/ship.png',
      iconSize: [28, 28],
      horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
      verticalOrigin: mars2d.VerticalOrigin.CENTER
    };

    const opt = {
      speed: options.speed ?? 40,
      weight: options.weight ?? 6,
      passedLineColor: options.passedLineColor ?? '#00f',
      notPassedLineColor: options.notPassedLineColor ?? '#f00',
      panTo: options.panTo ?? false,
      markerRotation: options.markerRotation ?? true,
      markerRotationOffset: options.markerRotationOffset ?? 0,
      markerStyle: { ...defaultMarkerStyle, ...(options.markerStyle || {}) },
      layer: options.layer ?? null
    };

    this.speedKmh = opt.speed;

    /* ===== 轨迹数据预处理 ===== */
    this.latlngs = path.map(normalizeLatLng);
    this.currentPos = { ...this.latlngs[0] };

    let total = 0;
    this.cumulativeLengths = [0];

    for (let i = 0; i < this.latlngs.length - 1; i++) {
      const d = haversineMeters(this.latlngs[i], this.latlngs[i + 1]);
      this.segmentLengths.push(d);
      total += d;
      this.cumulativeLengths.push(total);
    }

    this.totalLength = total;

    /* ===== 图层与图形 ===== */
    this.layer = opt.layer || new mars2d.layer.GraphicLayer();
    if (!opt.layer) map.addLayer(this.layer);

    this.notPassedLine = new mars2d.graphic.Polyline({
      latlngs: this.latlngs,
      style: { color: opt.notPassedLineColor, width: opt.weight }
    });

    this.passedLine = new mars2d.graphic.Polyline({
      latlngs: [this.latlngs[0]],
      style: { color: opt.passedLineColor, width: opt.weight }
    });

    this.marker = new mars2d.graphic.Marker({
      latlng: this.latlngs[0],
      style: opt.markerStyle
    });

    this.layer.addGraphic(this.notPassedLine);
    this.layer.addGraphic(this.passedLine);
    this.layer.addGraphic(this.marker);
  }

  /* =========================
   * 对外 API
   * ========================= */

  /** 开始播放 */
  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastTimestamp = performance.now();
    this.emit('start');
    this.loop();
  }

  /** 暂停播放 */
  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.emit('pause');
  }

  /** 设置播放速度（km/h） */
  setSpeed(speed: number): void {
    this.speedKmh = Math.max(0, speed);
  }

  /** 设置播放进度（0~1） */
  setProgress(p: number): void {
    this.progress01 = Math.max(0, Math.min(1, p));
    this.applyByDistance(this.totalLength * this.progress01);
    this.emit('progress', this.progress01, this.currentPos, this.currentIndex);
  }

  /** 移除播放器 */
  remove(): void {
    this.pause();
    this.layer.removeGraphic(this.marker);
    this.layer.removeGraphic(this.passedLine);
    this.layer.removeGraphic(this.notPassedLine);
    this.map.removeLayer(this.layer);
  }

  /* =========================
   * 核心动画循环
   * ========================= */

  private loop = (): void => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    const speedMs = (this.speedKmh * 1000) / 3600;
    const dist = this.totalLength * this.progress01 + speedMs * dt;

    if (dist >= this.totalLength) {
      this.applyByDistance(this.totalLength);
      this.progress01 = 1;
      this.emit('finished');
      return;
    }

    this.progress01 = dist / this.totalLength;
    this.applyByDistance(dist);
    this.emit('progress', this.progress01, this.currentPos, this.currentIndex);

    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * 根据“已走距离”更新 marker / 轨迹线
   */
  private applyByDistance(dist: number): void {
    let i = 0;
    while (
      i < this.cumulativeLengths.length - 1 &&
      this.cumulativeLengths[i + 1] < dist
    )
      i++;

    const start = this.latlngs[i];
    const end = this.latlngs[i + 1] ?? start;
    const segLen = this.segmentLengths[i] || 1;
    const t = (dist - this.cumulativeLengths[i]) / segLen;

    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;

    this.currentPos = { lat, lng };
    this.currentIndex = i;

    this.marker.setLatLng(this.currentPos);

    // 方向旋转
    const deg = bearingDeg(start, end);
    this.marker.setStyle({ rotation: deg });

    // 更新轨迹线
    this.passedLine.setLatLngs([
      ...this.latlngs.slice(0, i + 1),
      this.currentPos
    ]);
    this.notPassedLine.setLatLngs([
      this.currentPos,
      ...this.latlngs.slice(i + 1)
    ]);
  }
}
