<template>
  <div class="map-content">
    <MapView />
    <div ref="popupEl" class="popup">
      <span class="icon-close" @click="closePopup">✖</span>
      <div class="content">{{ currentCoordinate }}</div>
    </div>
  </div>
</template>

<script setup lang="ts" name="Popup">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useMapStore } from "@/store/modules/map";
import Overlay from "ol/Overlay";

import { MapView } from "@/components/MapView";

const mapStore = useMapStore();

const popupEl = ref(null); // 弹窗 DOM
const overlay = ref(null); // overlay 实例
const currentCoordinate = ref(""); // 当前坐标

const closePopup = () => {
  overlay.value?.setPosition(undefined);
  currentCoordinate.value = "";
};

onMounted(() => {
  const map = mapStore.getMap();
  if (!map) return;

  // 创建 overlay
  overlay.value = new Overlay({
    element: popupEl.value,
    autoPan: true
  });
  map.addOverlay(overlay.value);

  // 点击事件
  map.on("singleclick", evt => {
    const coordinate = evt.coordinate;
    currentCoordinate.value = coordinate;
    overlay.value.setPosition(coordinate);
  });
});

onBeforeUnmount(() => {
  const map = mapStore.getMap();
  if (map && overlay.value) {
    map.removeOverlay(overlay.value);
  }
});
</script>

<style scoped>
.popup {
  width: 400px;
  height: 50px;
  background: rgba(63, 72, 84, 0.8);
  position: absolute;
  top: -70px;
  left: -200px;
  box-sizing: border-box;
  padding: 10px;

  &::after {
    content: "";
    display: block;
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-bottom: 15px solid rgba(63, 72, 84, 0.8);
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
  }

  .icon-close {
    position: absolute;
    top: 0px;
    right: 8px;
    cursor: pointer;
  }

  .content {
    margin-top: 14px;
  }
}
</style>
