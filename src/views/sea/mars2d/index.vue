<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as mars2d from 'mars2d';
import { Mars2DTimeTrackPlayer } from './Mars2DTimeTrackPlayer';
import { TimedPoint } from '@/views/sea/mars2d/Mars2DTimeTrackPlayer';
import fc from './data.json';

let map: mars2d.Map;

function parseShipsFromGeoJSON(fc: any) {
  const ships: Array<{ id: string; points: TimedPoint[] }> = [];

  const features = fc?.features ?? [];
  features.forEach((f: any, idx: number) => {
    const coords: number[][] = f?.geometry?.coordinates ?? [];
    const times: string[] = f?.properties?.coordTimes ?? [];

    const n = Math.min(coords.length, times.length);
    if (n < 2) return;

    const points: TimedPoint[] = [];
    for (let i = 0; i < n; i++) {
      const [lng, lat] = coords[i];
      const t = Date.parse(times[i]); // ISO -> ms
      if (!Number.isFinite(t)) continue;
      points.push({ lat, lng, t });
    }

    if (points.length >= 2) {
      ships.push({ id: f?.properties?.id ?? `ship-${idx + 1}`, points });
    }
  });

  return ships;
}

let players: Mars2DTimeTrackPlayer[] = [];
let globalStart = 0;
let globalEnd = 0;
let inited = false;
// 每艘船自己维护一个“是否固定详情”的状态
let pinned = false;
async function initFleetFromGeojson(fc: any) {
  // 清理
  players.forEach(p => p.remove());
  players = [];

  const ships = parseShipsFromGeoJSON(fc);
  if (ships.length === 0) throw new Error('没有可用的船轨迹');

  // 计算全局时间范围（让所有船同一时间轴）
  globalStart = Math.min(...ships.map(s => s.points[0].t));
  globalEnd = Math.max(...ships.map(s => s.points[s.points.length - 1].t));

  ships.forEach((s, i) => {
    const p = new Mars2DTimeTrackPlayer(map, s.points, {
      speedFactor: 1200, // 时间倍速
      panTo: false,
      markerStyle: {
        image: '/ship.png',
        iconSize: [28, 28],
        horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
        verticalOrigin: mars2d.VerticalOrigin.CENTER
      }
    });

    p.marker.bindPopup('', {
      closeButton: false,
      autoClose: false,
      closeOnClick: false,
      offsetY: -30
    });

    // hover：仅当没有 pinned 时才显示
    p.marker.on(mars2d.EventType.mouseover, () => {
      if (pinned) return;

      const pos = p.currentPos;
      const html = `<div style="font-size:12px;">
      <b>船舶信息【hover】</b><br/>
      时间：${new Date(p.currentTime).toLocaleString()}<br/>
      经度：${pos.lng.toFixed(6)}<br/>
      纬度：${pos.lat.toFixed(6)}
    </div>`;

      // 更新内容 + 打开（只更新 content，不要重新 bind）
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

    // mouseout：仅当没有 pinned 时才关闭
    p.marker.on(mars2d.EventType.mouseout, () => {
      if (pinned) return;
      p.marker.closePopup();
    });

    // click：切换 pinned 状态（固定/取消固定）
    p.marker.on(mars2d.EventType.click, () => {
      pinned = !pinned;

      const html = pinned
        ? `<div style="width:240px">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4 style="margin:0;">船舶详情【click】</h4>
          <button id="pinCloseBtn" style="border:none;background:transparent;cursor:pointer;font-size:16px;">✕</button>
        </div>
        MMSI：${s.id}<br/>
        时间：${new Date(p.currentTime).toISOString()}<br/>
        经度：${p.currentPos.lng.toFixed(6)}<br/>
        纬度：${p.currentPos.lat.toFixed(6)}
      </div>`
        : ''; // 取消固定：先清空，后面 hover 会重新写

      if (typeof (p.marker as any).setPopupContent === 'function') {
        (p.marker as any).setPopupContent(html);
        if (pinned) p.marker.openPopup();
        else p.marker.closePopup();
      } else {
        const leaf = (p.marker as any)._layer;
        if (leaf?.setPopupContent) {
          leaf.setPopupContent(html);
          if (pinned) leaf.openPopup();
          else leaf.closePopup();
        }
      }

      // 如果 pin 住了，给“✕”绑定一次关闭逻辑（要等 DOM 渲染出来）
      if (pinned) {
        setTimeout(() => {
          const container = (p.marker as any)._popup?._container;
          const btn = container?.querySelector?.(
            '#pinCloseBtn'
          ) as HTMLElement | null;
          if (btn) {
            btn.onclick = () => {
              pinned = false;
              p.marker.closePopup();
            };
          }
        }, 0);
      }
    });

    players.push(p);
  });

  // 关键：统一设置到全局起始时间（对齐）
  players.forEach(p => p.setTime(globalStart));

  inited = true;
}

const handlePlay = () => {
  if (!inited) return;
  players.forEach(p => p.start());
};

const handlePause = () => {
  players.forEach(p => p.pause());
};

const handleSpeed = (factor: number) => {
  players.forEach(p => p.setSpeedFactor(factor));
};

// 还可以做一个时间轴拖动：
const setGlobalTime = (t: number) => {
  players.forEach(p => p.setTime(t));
};

onMounted(async () => {
  map = new mars2d.Map('mars2dContainer', {
    zoom: 6,
    center: { lng: 131.085263, lat: 33.30635 },
    basemaps: [{ name: '高德地图', type: 'gaode', layer: 'vec', show: true }]
  });
  await initFleetFromGeojson(fc);
});

onBeforeUnmount(() => {
  // mars2d Map 释放（不同版本可能是 destroy/remove）
  (map as any)?.destroy?.();
});
</script>

<template>
  <div class="h-[100%] w-[100%] relative">
    <div class="absolute left-[24px] top-[24px] z-401">
      <el-button type="primary" @click="handlePlay">开始播放</el-button>
    </div>

    <div id="mars2dContainer" class="mars2d-container" />
  </div>
</template>

<style scoped lang="scss">
.mars2d-container {
  width: 100%;
  height: 100%;
}
</style>
