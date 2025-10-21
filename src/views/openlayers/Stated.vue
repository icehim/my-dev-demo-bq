<template>
  <div class="map-body">
    <div class="layer-controls">
      <select v-model="currentLayer" @change="switchLayer">
        <option value="statellite">卫星图</option>
        <option value="terrain">地形图</option>
      </select>
    </div>
    <div id="olMap" class="map-box" />
  </div>
</template>

<script setup lang="ts" name="Stated">
import { ref, onMounted } from 'vue'; // vue相关方法
import { Map, View } from 'ol'; // 地图实例方法、视图方法
import 'ol/ol.css'; // 地图样式
import { Tile as TileLayer } from 'ol/layer';
import XYZ from 'ol/source/XYZ';

const mapRef = ref<any>(null); // 存放地图实例

const initMap = () => {
  // 地图实例
  mapRef.value = new Map({
    target: 'olMap',
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
};

const currentLayer = ref<'statellite' | 'terrain'>('terrain');

const layers: Record<'statellite' | 'terrain', TileLayer<XYZ>> = {
  statellite: new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    })
  }),
  terrain: new TileLayer({
    source: new XYZ({
      url: 'https://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'
    })
  })
};

const switchLayer = () => {
  mapRef.value.getLayers().clear();
  mapRef.value.addLayer(layers[currentLayer.value]);
};

onMounted(() => {
  initMap();
});
</script>
<style scoped lang="scss">
.map-body {
  position: relative;
  width: 100%;
  height: 100%;
}

.layer-controls {
  position: absolute;
  top: 10px;
  left: 30px;
  z-index: 1000;
  padding: 5px;
  background: white;
  border-radius: 4px;
}

.map-box {
  width: 100%;
  height: 100%;
  margin: 0 auto;
}

.main-content {
  margin: 0 !important;
}
</style>
