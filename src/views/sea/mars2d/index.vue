<script lang="ts" setup>
// 引入css
import shipData from './data.json';
import * as mars2d from 'mars2d';
import 'mars2d-esri';
import { nextTick, onMounted } from 'vue'; // 导入mars2d插件，导入即可，自动注册（按需使用，需要先npm install mars2d-esri）
let map; // mars2d.Map三维地图对象
import './leaflet.trackplayback.js';
const L = mars2d.L;
// 事件对象，用于抛出事件给vue
const eventTarget = new mars2d.BaseClass();
let trackplayback;
// 事件对象，用于抛出事件
const handlePlay = () => {
  trackplayback.clock.start();
};

let curTargetPoint: any = null; // 当前船的位置（经纬度+time+dir）
let lastPopup: any = null;

function bindShipClickPopup() {
  // 防止重复绑定
  map.off('click', onMapClick);
  map.on('click', onMapClick);
}

function onMapClick(evt: any) {
  if (!curTargetPoint) return;

  // 点击点（屏幕像素）
  const clickPt = evt.layerPoint;
  // 船当前位置（屏幕像素）
  const shipPt = map.latLngToLayerPoint([
    curTargetPoint.lat,
    curTargetPoint.lng
  ]);

  const hitRadiusPx = 18; // 命中半径，按你的船图标大小调大/调小
  if (clickPt.distanceTo(shipPt) <= hitRadiusPx) {
    // 命中：弹 popup
    const html = `
      <div style="min-width: 180px">
        <div style="font-weight:600;margin-bottom:6px">船只信息</div>
        <div>时间：${getShowTime(curTargetPoint.time)}</div>
        <div>航向：${parseInt(curTargetPoint.dir || 0)}°</div>
        ${curTargetPoint.info?.length ? `<hr style="margin:6px 0" />` : ''}
        ${
          curTargetPoint.info?.length
            ? curTargetPoint.info
                .map((it: any) => `<div>${it.key}：${it.value}</div>`)
                .join('')
            : ''
        }
      </div>
    `;

    lastPopup && map.closePopup(lastPopup);
    lastPopup = L.popup()
      .setLatLng([curTargetPoint.lat, curTargetPoint.lng])
      .setContent(html)
      .openOn(map);
  }
}

function getInfo() {
  const simpleCurTime = trackplayback.clock.getCurTime();
  const simpleStartTime = trackplayback.clock.getStartTime();
  const simpleEndTime = trackplayback.clock.getEndTime();

  return {
    curTime: getShowTime(simpleCurTime),
    startTime: getShowTime(simpleStartTime),
    endTime: getShowTime(simpleEndTime),
    speed: trackplayback.clock.getSpeed(),
    simpleCurTime,
    simpleStartTime,
    simpleEndTime
  };
}

function getShowTime(time, accuracy = 's') {
  time = parseInt(time * 1000);
  const newDate = new Date(time);
  const year = newDate.getFullYear();
  const month =
    newDate.getMonth() + 1 < 10
      ? '0' + (newDate.getMonth() + 1)
      : newDate.getMonth() + 1;
  const day =
    newDate.getDate() < 10 ? '0' + newDate.getDate() : newDate.getDate();
  const hours =
    newDate.getHours() < 10 ? '0' + newDate.getHours() : newDate.getHours();
  const minuts =
    newDate.getMinutes() < 10
      ? '0' + newDate.getMinutes()
      : newDate.getMinutes();
  const seconds =
    newDate.getSeconds() < 10
      ? '0' + newDate.getSeconds()
      : newDate.getSeconds();
  let ret;
  if (accuracy === 'd') {
    ret = year + '-' + month + '-' + day;
  } else if (accuracy === 'h') {
    ret = year + '-' + month + '-' + day + ' ' + hours;
  } else if (accuracy === 'm') {
    ret = year + '-' + month + '-' + day + ' ' + hours + ':' + minuts;
  } else {
    ret =
      year +
      '-' +
      month +
      '-' +
      day +
      ' ' +
      hours +
      ':' +
      minuts +
      ':' +
      seconds;
  }
  return ret;
}

onMounted(() => {
  map = new mars2d.Map('mars2dContainer', {
    zoom: 6,
    center: { lng: 131.085263, lat: 33.30635 },
    basemaps: [{ name: '高德地图', type: 'gaode', layer: 'vec', show: true }]
  });

  nextTick(() => {
    trackplayback = L.trackplayback(shipData, map, {
      targetOptions: { useImg: true, imgUrl: '/ship.png' }
    });

    // 初始化当前船位置（还没播放时）
    const track0 = trackplayback.tracks?.[0];
    if (track0) {
      const t0 = trackplayback.clock.getCurTime();
      curTargetPoint =
        track0._getCalculateTrackPointByTime(t0) ||
        track0.getTrackPointByTime(t0);
    }

    const info = getInfo();
    eventTarget.fire('dataLoad', { info });

    trackplayback.clock.on('tick', function () {
      // ✅ 用 clock.getCurTime 更稳
      const track0 = trackplayback.tracks?.[0];
      if (track0) {
        const t = trackplayback.clock.getCurTime();
        curTargetPoint =
          track0._getCalculateTrackPointByTime(t) ||
          track0.getTrackPointByTime(t);
      }

      const info = getInfo();
      eventTarget.fire('dataLoad', { info });
    });

    bindShipClickPopup();
  });
});
</script>

<template>
  <div class="h-[100%] w-[100%]">
    <el-button type="primary" @click="handlePlay">开始播放</el-button>
    <div id="mars2dContainer" class="mars2d-container" />
  </div>
</template>

<style scoped lang="scss">
.mars2d-container {
  width: 100%;
  height: 100%;
}
</style>
