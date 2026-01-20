import * as mars2d from 'mars2d';

export interface TimedPoint {
  lat: number;
  lng: number;
  /** 毫秒时间戳（UTC） */
  t: number;
}

export interface TimeTrackPlayerOptions {
  /** 时间倍速：1=真实速度，2=2倍速，10=10倍速 */
  speedFactor?: number;

  /** 是否播放时地图跟随 */
  panTo?: boolean;

  /** 是否旋转（沿轨迹方向） */
  markerRotation?: boolean;

  /** 旋转角度偏移（图片默认朝向不一致时用） */
  markerRotationOffset?: number;

  /** marker 样式（透传 mars2d Marker style） */
  markerStyle?: any;

  /** 轨迹线宽 */
  weight?: number;
  /** 已走颜色 */
  passedLineColor?: string;
  /** 未走颜色 */
  notPassedLineColor?: string;

  /** 可选：外部传入图层 */
  layer?: any;
  passedLineStyle?: any;
  notPassedLineStyle?: any;
}

type EventName = 'start' | 'pause' | 'finished' | 'time';
type Handler = (...args: any[]) => void;

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

/** 计算方位角（用于旋转） */
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
 * 单船：时间轴轨迹播放器
 * - 输入：TimedPoint[]（必须按 t 递增）
 * - 核心：setTime(t) -> 插值 -> marker.setLatLng
 */
export class Mars2DTimeTrackPlayer extends Emitter {
  public readonly map: any;
  public readonly layer: any;
  public readonly marker: any;
  public readonly passedLine: any;
  public readonly notPassedLine: any;

  /** 当前时间（ms） */
  public currentTime = 0;
  /** 当前实时位置（给 popup 用） */
  public currentPos: { lat: number; lng: number } = { lat: 0, lng: 0 };
  /** 当前所在段 index：点 i 到 i+1 */
  public currentIndex = 0;

  private points: TimedPoint[];
  private options: Required<TimeTrackPlayerOptions>;

  private playing = false;
  private lastTs = 0;
  private rafId: number | null = null;

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

    // 确保按时间排序（后端一般已保证，这里保险）
    this.points = [...points].sort((a, b) => a.t - b.t);

    this.map = map;
    this.startTime = this.points[0].t;
    this.endTime = this.points[this.points.length - 1].t;
    this.currentTime = this.startTime;
    this.currentPos = { lat: this.points[0].lat, lng: this.points[0].lng };

    const defaultMarkerStyle = {
      image: 'img/marker/ship.png',
      iconSize: [28, 28],
      horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
      verticalOrigin: mars2d.VerticalOrigin.CENTER
    };

    this.options = {
      speedFactor: options.speedFactor ?? 60, // 默认给个快一点，真实回放常用 10~600 倍
      panTo: options.panTo ?? false,
      markerRotation: options.markerRotation ?? true,
      markerRotationOffset: options.markerRotationOffset ?? 0,
      markerStyle: { ...defaultMarkerStyle, ...(options.markerStyle ?? {}) },
      weight: options.weight ?? 6,
      passedLineColor: options.passedLineColor ?? '#00f',
      notPassedLineColor: options.notPassedLineColor ?? '#f00',
      layer: options.layer ?? null,
      // ✅ 新增：默认样式对象（必须给）
      passedLineStyle: options.passedLineStyle ?? {},
      notPassedLineStyle: options.notPassedLineStyle ?? {}
    };

    // 图层
    this.layer = this.options.layer || new (mars2d as any).layer.GraphicLayer();
    if (!this.options.layer) map.addLayer(this.layer);

    // 线（未走=全线；已走=从起点开始）
    const latlngs = this.points.map(p => ({ lat: p.lat, lng: p.lng }));
    this.notPassedLine = new (mars2d as any).graphic.Polyline({
      latlngs,
      style: {
        color: this.options.notPassedLineColor,
        width: this.options.weight,
        opacity: 0.35,
        dashArray: '8,8',
        lineCap: 'butt',
        lineJoin: 'miter',
        ...this.options.notPassedLineStyle
      }
    });
    // ✅ 已走：AntPath 动画线
    this.passedLine = new (mars2d as any).graphic.AntPath({
      latlngs: [latlngs[0]], // 初始只有起点
      style: {
        color: this.options.passedLineColor,
        width: this.options.weight,
        delay: 1000,
        dashArray: '10,20',
        pulseColor: '#ffffff',
        lineCap: 'butt',
        lineJoin: 'miter',
        ...this.options.passedLineStyle
      }
    });

    // 船
    this.marker = new (mars2d as any).graphic.Marker({
      latlng: latlngs[0],
      style: this.options.markerStyle
    });

    this.layer.addGraphic(this.notPassedLine);
    this.layer.addGraphic(this.passedLine);
    this.layer.addGraphic(this.marker);

    // 初始化到 startTime
    this.setTime(this.startTime);
  }

  /** 播放 */
  start() {
    if (this.playing) return;
    this.playing = true;
    this.lastTs = performance.now();
    this.passedLine?.setStyle?.({ paused: false });
    this.emit('start');
    this.loop();
  }

  /** 暂停 */
  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.passedLine?.setStyle?.({ paused: true });
    this.rafId = null;
    this.emit('pause');
  }

  /** 设置倍速（时间倍速） */
  setSpeedFactor(f: number) {
    this.options.speedFactor = Math.max(0, Number(f) || 0);
  }

  /** 跳到某个时间点（ms） */
  setTime(t: number) {
    const tt = Math.max(
      this.startTime,
      Math.min(this.endTime, Number(t) || this.startTime)
    );
    this.currentTime = tt;
    this.applyTime(tt);
    this.emit('time', this.currentTime, this.currentPos, this.currentIndex);
  }

  /** 回到起点 */
  reset() {
    this.setTime(this.startTime);
  }

  /** 移除 */
  remove() {
    this.pause();
    this.layer.removeGraphic(this.marker);
    this.layer.removeGraphic(this.passedLine);
    this.layer.removeGraphic(this.notPassedLine);
    if (!this.options.layer) this.map.removeLayer(this.layer);
  }

  /** 动画循环：推进时间 */
  private loop = () => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;

    const nextTime = this.currentTime + dt * 1000 * this.options.speedFactor;
    if (nextTime >= this.endTime) {
      this.setTime(this.endTime);
      this.playing = false;
      this.emit('finished');
      return;
    }

    this.setTime(nextTime);
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * 核心：根据时间 t 插值位置并更新图形
   */
  private applyTime(t: number) {
    // 找到 t 所在区间 [i, i+1]
    let i = this.currentIndex;
    if (t < this.points[i].t) i = 0;
    while (i < this.points.length - 2 && this.points[i + 1].t < t) i++;
    this.currentIndex = i;

    const a = this.points[i];
    const b = this.points[i + 1];
    const span = Math.max(1, b.t - a.t);
    const ratio = Math.max(0, Math.min(1, (t - a.t) / span));

    const lat = a.lat + (b.lat - a.lat) * ratio;
    const lng = a.lng + (b.lng - a.lng) * ratio;
    const pos = { lat, lng };
    this.currentPos = pos;

    // 更新 marker
    this.marker.setLatLng(pos);

    // 旋转（优先用 rotationAngle）
    if (this.options.markerRotation) {
      const deg = bearingDeg(a, b) + (this.options.markerRotationOffset ?? 0);
      this.marker.setStyle({
        rotationAngle: deg,
        rotationOrigin: 'center center'
      });
    }

    // 更新已走/未走线（简单做法：已走=到 i+pos，未走=pos 到末尾）
    const base = this.points.map(p => ({ lat: p.lat, lng: p.lng }));
    const passed = base.slice(0, i + 1);
    passed.push(pos);
    this.passedLine.setLatLngs(passed);
    const notPassed = [pos, ...base.slice(i + 1)];
    this.notPassedLine.setLatLngs(notPassed);

    if (this.options.panTo) {
      this.map.setView(pos);
    }
  }
}
