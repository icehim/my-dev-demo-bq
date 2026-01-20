<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as mars2d from 'mars2d';
import { Mars2DTrackPlayer } from './Mars2DTrackPlayer';

let map: mars2d.Map;
let player: Mars2DTrackPlayer | null = null;

// 是否已准备好轨迹（避免按钮点了没数据）
const ready = ref(false);

// 轨迹点缓存（单船）
let latlngs: Array<{ lat: number; lng: number }> = [];

/** 点击按钮：开始播放（如果没创建 player，就创建；创建后就 start） */
const handlePlay = () => {
  if (!map) return;

  // 没加载好轨迹就不播
  if (!ready.value || latlngs.length < 2) {
    console.warn('轨迹数据未就绪');
    return;
  }

  // 第一次点击：创建播放器
  if (!player) {
    player = new Mars2DTrackPlayer(map, latlngs, {
      speed: 80,
      panTo: true,
      markerStyle: {
        // ✅ 先用你项目里肯定存在的图标跑通也行
        // 没有 ship.png 就换成 img/marker/bike.png 之类
        image: '/ship.png',
        iconSize: [28, 28],
        horizontalOrigin: mars2d.HorizontalOrigin.CENTER,
        verticalOrigin: mars2d.VerticalOrigin.CENTER
      }
    });

    // 1) 先绑定一个空 popup（只绑定一次）
    player.marker.bindPopup('', {
      // 这两个按需：一般默认就行
      autoClose: true,
      closeOnClick: true
    });

    // 2) 点击时：更新内容 + open（不要再 bindPopup）
    player.marker.on(mars2d.EventType.click, () => {
      if (!player) return;
      const p = player.currentPos;
      const html = `实时位置<br/>lat: ${p.lat.toFixed(6)}<br/>lng: ${p.lng.toFixed(6)}`;

      // ✅ 优先用 mars2d 的 API（如果有）
      if (typeof (player.marker as any).setPopupContent === 'function') {
        (player.marker as any).setPopupContent(html);
        player.marker.openPopup();
        return;
      }
    });
  }

  // 开始/继续播放
  player.start();
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
  player?.remove();
  player = null;

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
