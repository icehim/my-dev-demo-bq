<template>
  <div id="map" ref="mapRef" class="map" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useMapStore } from '@/store/modules/map';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import 'ol/ol.css'; // 地图样式

const mapStore = useMapStore();
const mapRef = ref(null);

defineOptions({
  name: 'MapView'
});

onMounted(() => {
  let map = mapStore.getMap();
  if (!map) {
    // 首次创建
    map = new Map({
      target: mapRef.value,
      layers: [
        new TileLayer({
          source: new XYZ({
            // url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            // 使用 ArcGIS 在线地图:url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            // 使用 OSM 在线地图: url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            // 使用 Google 在线地图: url: 'http://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            // 使用高德地图:
            url: 'https://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'
          })
        })
      ],
      view: new View({
        // 地图视图
        projection: 'EPSG:4326', // 坐标系，有EPSG:4326和EPSG:3857
        center: [114.064839, 22.548857], // 深圳坐标
        minZoom: 1, // 地图缩放最小级别
        maxZoom: 19, // 地图缩放最大级别
        zoom: 12 // 地图缩放级别（打开页面时默认级别）
      })
    });
    mapStore.setMap(map);
  } else {
    // 复用已有实例，只切换 target
    map.setTarget('map');
  }
});

onBeforeUnmount(() => {
  const map = mapStore.getMap();
  if (map) {
    // 离开页面时解绑，避免指向已销毁的 DOM
    map.setTarget(null);
  }
});
</script>

<style scoped>
.map {
  width: 100%;
  height: 100%;
}

.main-content {
  margin: 0 !important;
}
</style>
