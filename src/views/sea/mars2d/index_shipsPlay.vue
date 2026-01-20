<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as mars2d from 'mars2d';
import { Mars2DTrackPlayer } from './Mars2DTrackPlayer';
import { offsetPathMeters } from '@/views/sea/mars2d/utils';

let map: mars2d.Map;
let players: Mars2DTrackPlayer[] = [];

// 是否已准备好轨迹（避免按钮点了没数据）
const ready = ref(false);

// 轨迹点缓存（单船）
let latlngs: Array<{ lat: number; lng: number }> = [];
function createFleet() {
  // 清理旧的
  players.forEach(p => p.remove());
  players = [];

  const shipCount = 20;
  const spacingMeters = 25; // 每艘船横向间隔 25 米（你可调：10~50）
  const progressGap = 0.02; // 每艘船起始进度错开 2%（你可调）

  for (let i = 0; i < shipCount; i++) {
    // 让船在轨迹左右展开：-10,-9,...,0,...,+9
    const laneIndex = i - (shipCount - 1) / 2;
    const offset = laneIndex * spacingMeters;

    const path2 = offsetPathMeters(map, latlngs, offset);

    const p = new Mars2DTrackPlayer(map, path2, {
      speed: 80,
      panTo: false,
      markerRotation: true,
      markerRotationOffset: 0,
      markerStyle: {
        image: '/ship.png',
        iconSize: [28, 28],
        horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
        verticalOrigin: mars2d.VerticalOrigin.CENTER
      }
    });

    // 错开初始进度（防止堆在起点）
    p.setProgress((i * progressGap) % 1);

    // 点击船：显示实时坐标 + 船编号
    p.marker.bindPopup('', { autoClose: true, closeOnClick: true });
    p.marker.on(mars2d.EventType.click, () => {
      const pos = p.currentPos;
      const html = `船#${i + 1}<br/>lat: ${pos.lat.toFixed(6)}<br/>lng: ${pos.lng.toFixed(6)}`;
      const leafMarker = (p.marker as any)._layer;
      if ((p.marker as any).setPopupContent) {
        (p.marker as any).setPopupContent(html);
        p.marker.openPopup();
      } else if (leafMarker?.setPopupContent) {
        leafMarker.setPopupContent(html);
        leafMarker.openPopup();
      } else {
        p.marker.bindPopup(html).openPopup();
      }
    });

    players.push(p);
  }
}
/** 点击按钮：开始播放（如果没创建 player，就创建；创建后就 start） */
const handlePlay = () => {
  if (!ready.value) return;
  if (players.length === 0) createFleet();
  players.forEach(p => p.start());
  // 没加载好轨迹就不播
  if (!ready.value || latlngs.length < 2) {
    console.warn('轨迹数据未就绪');
    return;
  }
};

onMounted(async () => {
  map = new mars2d.Map('mars2dContainer', {
    zoom: 6,
    center: { lng: 131.085263, lat: 33.30635 },
    basemaps: [{ name: '高德地图', type: 'gaode', layer: 'vec', show: true }]
  });

  // ✅ 拉一条示例轨迹（先跑通单船）
  try {
    const geojson: any = await mars2d.Util.fetchJson({
      url: 'http://data.mars2d.cn/file/geojson/tianzhushan.json'
    });

    latlngs = mars2d.PointTrans.coords2latlngs(
      geojson.features[0].geometry.coordinates
    ) as Array<{ lat: number; lng: number }>;

    // ✅ 用 Leaflet 推荐写法生成 bounds（不会依赖 fromPoints）
    const bounds = mars2d.L.latLngBounds(
      latlngs.map(p => [p.lat, p.lng]) as any
    );
    map.fitBounds(bounds);

    ready.value = true;
  } catch (err) {
    console.error('加载轨迹失败：', err);
    ready.value = false;
  }
});

onBeforeUnmount(() => {
  players.forEach(p => p.remove());
  players = null;

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
