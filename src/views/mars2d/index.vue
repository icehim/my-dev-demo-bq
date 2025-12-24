<script setup lang="ts">
import { onMounted, ref } from "vue";

import * as mars2d from "mars2d";

const map = ref<mars2d.Map>();

onMounted(() => {
  map.value = new mars2d.Map("mars2dContainer", {
    zoom: 10,
    center: { lng: 116.39, lat: 39.9 },
    basemaps: [
      {
        name: "高德地图",
        type: "gaode",
        layer: "vec",
        show: true
      }
    ]
  });
  const layer = new mars2d.layer.WmsLayer({
    url: "http://localhost:8080/geoserver/beijing/wms",
    layers: "beijing:gis_osm_railways_free_2",
    transparent: true,
    format: "image/png",
    style: ""
  });
  map.value.addLayer(layer);
  const resultLayer = new mars2d.layer.GraphicLayer();
  map.value.addLayer(resultLayer);
  layer.on(mars2d.EventType.click, function (event) {
    console.log("单击了wms图层", event);

    if (event.feature) {
      resultLayer.clear();

      const graphicsOptions = mars2d.Util.geoJsonToGraphics(event.feature, {
        type: "polyline",
        style: {
          width: 5,
          color: "#ff0000"
        }
      });
      resultLayer.addGraphic(graphicsOptions);
    }
  });
});
</script>

<template>
  <div id="mars2dContainer" class="mars2d-container" />
</template>

<style scoped>
.main-content {
  margin: 0 !important;
}
</style>
