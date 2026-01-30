<script lang="ts" setup>
/**
 * index.vue（Vue3 + <script setup> + TypeScript）
 * ------------------------------------------------------------
 * 这个页面演示：
 * - 读取后端数组数据（非 GeoJSON）
 *   - cbnm: 船舶标识
 *   - resultVo: [{ jd, wd, time }]
 *   - triggerTimes: [ISO时间字符串, ...]
 * - 每个船舶记录生成一艘船（一个 Mars2DTimeTrackPlayer 实例）
 * - 支持：播放/暂停/倍速/时间轴拖动（seek）
 * - 支持：hover popup（轻量信息） + click popup（固定详情）
 *
 * 你后续接后端时，只要把 fc 换成接口返回的数据即可。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as mars2d from 'mars2d';

// 播放器：时间轴驱动（按时间戳插值）
import { Mars2DTimeTrackPlayer } from './Mars2DTimeTrackPlayer';
import type { TimedPoint } from './Mars2DTimeTrackPlayer';

// 本地模拟数据（后续替换成后端请求返回）
import fc from './newData.json';
import { FleetTimelineController } from '@/views/sea/mars2d/FleetTimelineController';
import dayjs from 'dayjs';

let map: mars2d.Map;

/** UI：当前倍速（时间倍速） */
const speed = ref(1);

/**
 * UI：时间轴 slider 的值（毫秒时间戳）
 * - v-model 绑定
 * - 播放时会自动更新
 * - 拖动时会同步 setTime 到所有船
 */
const timelineValue = ref(0);

/** UI：是否正在拖动（避免播放时 timelineValue 被回写导致抖动） */
const dragging = ref(false);

/** 倍速档位（可按需增删） */
const speedOptions = ref([
  { label: '1x（实时）', value: 1 },
  { label: '5x', value: 5 },
  { label: '20x', value: 20 },
  { label: '100x', value: 100 },
  { label: '600x', value: 600 },
  { label: '3600x（1小时）', value: 3600 },
  { label: '7200x（2小时）', value: 7200 }
]);

/** 格式化时间，用于 UI 显示 */
const formatTime = (t: number) => {
  return new Date(t).toLocaleString('zh-CN', { hour12: false });
};

/**
 * 解析后端数据：
 * - 每个记录 => { id, points[], triggerTimes[] }
 */
function parseShipsFromGeoJSON(fcAny: any) {
  const ships: Array<{
    id: string;
    points: TimedPoint[];
    triggerTimes: number[];
  }> = [];

  const records = Array.isArray(fcAny)
    ? fcAny
    : Array.isArray(fcAny?.data)
      ? fcAny.data
      : fcAny
        ? [fcAny]
        : [];
  records.forEach((record: any, idx: number) => {
    const trackPoints = record?.resultVo ?? [];
    const points: TimedPoint[] = trackPoints
      .map((point: any) => {
        const lng = Number(point?.jd);
        const lat = Number(point?.wd);
        const t = Date.parse(point?.time);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
        if (!Number.isFinite(t)) return null;
        return { lat, lng, t };
      })
      .filter((point: TimedPoint | null): point is TimedPoint =>
        Boolean(point)
      );

    const triggerTimes = (record?.triggerTimes ?? [])
      .map((time: string) => Date.parse(time))
      .filter((time: number) => Number.isFinite(time));

    const triggerTimes = (f?.properties?.triggerTimes ?? [])
      .map((time: string) => Date.parse(time))
      .filter((time: number) => Number.isFinite(time));

    if (points.length >= 2) {
      ships.push({
        id: record?.cbnm ?? `ship-${idx + 1}`,
        points,
        triggerTimes
      });
    }
  });

  return ships;
}

/** 所有船的播放器实例 */
let players: Mars2DTimeTrackPlayer[] = [];

/** 全局时间范围（统一时间轴） */
let globalStart = 0;
let globalEnd = 0;

/** 是否初始化完成（避免按钮误触） */
let inited = false;
let controller: FleetTimelineController;
/**
 * 初始化船队（核心）
 * - 清理旧实例
 * - 解析 GeoJSON
 * - 计算全局时间范围
 * - 为每条 feature 创建一个播放器实例
 * - 将所有船对齐到 globalStart
 */
async function initFleetFromGeojson(fcAny: any) {
  // 1) 清理旧实例（避免重复绑定事件/内存泄漏）
  players.forEach(p => p.remove());
  players = [];

  // 2) 解析数据
  const ships = parseShipsFromGeoJSON(fcAny);
  if (ships.length === 0) throw new Error('没有可用的船轨迹');

  // 3) 计算全局时间范围：所有船统一时间轴
  globalStart = Math.min(...ships.map(s => s.points[0].t));
  globalEnd = Math.max(...ships.map(s => s.points[s.points.length - 1].t));

  // 4) 创建播放器实例
  ships.forEach((s, i) => {
    const p = new Mars2DTimeTrackPlayer(map, s.points, {
      // 时间倍速：1 秒真实时间推进多少“轨迹秒”
      speedFactor: speed.value,

      // 多船同时播放一般不建议 panTo
      panTo: false,

      // marker 样式：图标自行放在 public/ship.png
      markerStyle: {
        image: '/ship.png',
        iconSize: [28, 28],
        horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
        verticalOrigin: mars2d.VerticalOrigin.CENTER
      },

      // 已走线：AntPath 动态虚线（示例参数，可自行微调）
      passedLineStyle: {
        color: '#ec6137',
        delay: 1000,
        opacity: 0.9,
        width: 3,
        dashArray: '10,20',
        pulseColor: '#ffffff',
        lineCap: 'butt',
        lineJoin: 'miter'
      },

      // 未走/背景线：静态虚线（整条航线）
      notPassedLineStyle: {
        color: '#3b7bf6',
        width: 3,
        opacity: 0.6,
        dashArray: '8,8',
        lineCap: 'butt',
        lineJoin: 'miter'
      },
      triggerTimes: s.triggerTimes
    });

    // ---------------------------
    // Popup 交互：hover / click
    // ---------------------------

    // 每艘船独立维护一个 pinned 状态：
    // - pinned=false：hover 显示轻量信息，鼠标移走自动关闭
    // - pinned=true ：click 固定详情，不随 mouseout 关闭
    let pinned = false;

    // 只 bind 一次 popup（不要每次 hover/click 反复 bind）
    p.marker.bindPopup('', {
      closeButton: false,
      autoClose: false,
      closeOnClick: false,
      offsetY: -30
    });

    // hover：仅在未 pinned 时显示
    p.marker.on(mars2d.EventType.mouseover, () => {
      if (pinned) return;

      const pos = p.currentPos;
      const html = `<div style="font-size:12px;">
          <b>船舶信息【hover】</b><br/>
          ID：${s.id}<br/>
          时间：${formatTime(p.currentTime)}<br/>
          经度：${pos.lng.toFixed(6)}<br/>
          纬度：${pos.lat.toFixed(6)}
        </div>`;

      if (typeof (p.marker as any).setPopupContent === 'function') {
        (p.marker as any).setPopupContent(html);
        p.marker.openPopup();
      } else {
        const leaf = (p.marker as any)._layer;
        if (leaf?.setPopupContent) {
          leaf.setPopupContent(html);
          leaf.openPopup();
        }
      }
    });

    // hover 离开：仅在未 pinned 时关闭
    p.marker.on(mars2d.EventType.mouseout, () => {
      if (pinned) return;
      p.marker.closePopup();
    });

    // click：切换 pinned（固定/取消固定）
    p.marker.on(mars2d.EventType.click, () => {
      pinned = !pinned;

      if (!pinned) {
        p.marker.closePopup();
        return;
      }

      const html = `<div style="width:240px">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h4 style="margin:0;">船舶详情【click】</h4>
            <button id="pinCloseBtn-${i}" style="border:none;background:transparent;cursor:pointer;font-size:16px;">✕</button>
          </div>
          ID：${s.id}<br/>
          时间：${new Date(p.currentTime).toISOString()}<br/>
          经度：${p.currentPos.lng.toFixed(6)}<br/>
          纬度：${p.currentPos.lat.toFixed(6)}
        </div>`;

      if (typeof (p.marker as any).setPopupContent === 'function') {
        (p.marker as any).setPopupContent(html);
        p.marker.openPopup();
      } else {
        const leaf = (p.marker as any)._layer;
        if (leaf?.setPopupContent) {
          leaf.setPopupContent(html);
          leaf.openPopup();
        }
      }

      // 绑定关闭按钮事件（DOM 渲染后再取）
      setTimeout(() => {
        const container = (p.marker as any)._popup?._container;
        const btn = container?.querySelector?.(
          `#pinCloseBtn-${i}`
        ) as HTMLElement | null;
        if (btn) {
          btn.onclick = () => {
            pinned = false;
            p.marker.closePopup();
          };
        }
      }, 0);
    });

    p.on('trigger', triggerTime => {
      void handleShipTrigger(s.id, triggerTime);
    });

    players.push(p);
  });

  // 5) 将所有船对齐到全局起始时间
  players.forEach(p => p.setTime(globalStart));

  // 6) 初始化时间轴 UI（slider）
  timelineValue.value = globalStart;

  controller = new FleetTimelineController({
    startTime: globalStart,
    endTime: globalEnd,
    speed: speed.value,
    players
  });

  controller.onTime(t => {
    if (!dragging.value) {
      timelineValue.value = t;
    }
  });

  inited = true;
}

/** 播放：所有船一起 start */
const handlePlay = () => {
  if (!inited) return;
  controller.play();
};

/** 暂停：所有船一起 pause（pause 内部也会停 AntPath） */
const handlePause = () => {
  controller.pause();
};

/** 改倍速：所有船一起 setSpeedFactor */
const handleSpeed = (factor: number) => {
  speed.value = factor;
  controller.setSpeed(factor);
};

/**
 * 时间轴拖动（seek）
 * 推荐用 Element Plus 的 @input + @change：
 * - input：拖动过程中持续触发 -> pause + setTime
 * - change：松手触发 -> 结束拖动状态
 */
const onTimelineInput = (val: number) => {
  // 第一次触发 input 时：认为开始拖动，先暂停（含 AntPath）
  if (!dragging.value) {
    dragging.value = true;
    controller.pause();
  }
  controller.setTime(val);
};

const onTimelineChange = (val: number) => {
  controller.setTime(val);
  dragging.value = false;
};

onMounted(async () => {
  // 1) 初始化地图
  map = new mars2d.Map('mars2dContainer', {
    zoom: 6,
    center: { lng: 131.085263, lat: 33.30635 },
    basemaps: [{ name: '高德地图', type: 'gaode', layer: 'vec', show: true }]
  });

  // 2) 初始化船队（本地 mock；后续替换后端返回）
  await initFleetFromGeojson(fc);
});

const handleShipTrigger = async (shipId: string, triggerTime: number) => {
  console.log(
    '触发：',
    shipId,
    dayjs(triggerTime).format('YYYY-MM-DD hh:mm:ss')
  );
};

onBeforeUnmount(() => {
  // 清理播放器实例
  players.forEach(p => p.remove());
  players = [];

  // mars2d Map 释放（不同版本可能是 destroy/remove）
  (map as any)?.destroy?.();
});
</script>

<template>
  <div class="h-[100%] w-[100%] relative">
    <!-- 操作面板 -->
    <div class="absolute left-[24px] top-[24px] z-401 flex gap-2">
      <el-button type="primary" @click="handlePlay">开始播放</el-button>
      <el-button @click="handlePause">暂停</el-button>

      <!-- 倍速选择（你也可以换成 el-select） -->
      <el-select
        v-model="speed"
        style="width: 180px"
        placeholder="倍速"
        @change="handleSpeed"
      >
        <el-option
          v-for="opt in speedOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </div>

    <!-- 时间轴（底部） -->
    <div class="absolute left-[24px] right-[24px] bottom-[24px] z-401">
      <el-slider
        v-model="timelineValue"
        :min="globalStart"
        :max="globalEnd"
        :step="1000"
        :show-tooltip="false"
        @input="onTimelineInput"
        @change="onTimelineChange"
      />
      <div class="text-center text-xs mt-1">
        {{ formatTime(timelineValue) }}
      </div>
    </div>

    <!-- 地图容器 -->
    <div id="mars2dContainer" class="mars2d-container" />
  </div>
</template>

<style scoped lang="scss">
.mars2d-container {
  width: 100%;
  height: 100%;
}
</style>
