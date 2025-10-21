<template>
  <div class="carriage-container">
    <h3>火车车厢摆放拖拽示例</h3>

    <div class="controls">
      <label>
        比例 (px / m)：
        <input
          v-model.number="scale"
          type="number"
          step="1"
          @change="onScaleChange"
        />
      </label>
      <button @click="resetPositions">重置位置</button>
    </div>

    <div id="container" ref="containerRef" class="canvas-box" />

    <div class="info">
      <strong>说明：</strong>车厢：13m × 3m（载重 65t）；汽车：5.65m × 2.38m（重
      3.25t）。拖拽汽车，若与另一辆汽车重叠则交换位置；拖拽受车厢边界限制。
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import Konva from 'konva';

// ==== 参数定义 ====
const CARRIAGE = { length: 13, width: 3, capacity_t: 65 };
const CAR = { length: 5.65, width: 2.38, weight_t: 3.25 };

// ==== Vue 状态 ====
const scale = ref(50); // 像素/米
const containerRef = ref(null);

let stage, layer;
let vehicles = [];

const px = m => m * scale.value;

const initStage = () => {
  const container = containerRef.value;
  if (!container) return;

  stage = new Konva.Stage({
    container: container,
    width: container.clientWidth,
    height: container.clientHeight
  });
  layer = new Konva.Layer();
  stage.add(layer);

  drawStage();
};

const drawStage = () => {
  layer.destroyChildren();

  const carriagePx = { w: px(CARRIAGE.length), h: px(CARRIAGE.width) };
  const carriageX = (stage.width() - carriagePx.w) / 2;
  const carriageY = 60;

  const title = new Konva.Text({
    x: 10,
    y: 8,
    text: `车厢: ${CARRIAGE.length}m × ${CARRIAGE.width}m (载重 ${CARRIAGE.capacity_t}t)  车辆: ${CAR.length}m × ${CAR.width}m (${CAR.weight_t}t)`,
    fontSize: 14,
    fontFamily: 'Microsoft Yahei',
    fill: '#333'
  });
  layer.add(title);

  // 车厢矩形
  const carriageRect = new Konva.Rect({
    x: carriageX,
    y: carriageY,
    width: carriagePx.w,
    height: carriagePx.h,
    stroke: '#333',
    strokeWidth: 2,
    cornerRadius: 4,
    fill: '#fafafa'
  });
  layer.add(carriageRect);

  // 网格
  const gridGroup = new Konva.Group({ x: carriageX, y: carriageY });
  for (let i = 1; i < CARRIAGE.length; i++) {
    const x = px(i);
    gridGroup.add(
      new Konva.Line({
        points: [x, 0, x, carriagePx.h],
        stroke: '#e6e6e6',
        strokeWidth: 1
      })
    );
  }
  for (let j = 1; j < CARRIAGE.width; j++) {
    const y = px(j);
    gridGroup.add(
      new Konva.Line({
        points: [0, y, carriagePx.w, y],
        stroke: '#e6e6e6',
        strokeWidth: 1
      })
    );
  }
  layer.add(gridGroup);

  // 车辆
  vehicles = [];
  const carPx = { w: px(CAR.length), h: px(CAR.width) };
  const gap = px(0.3);
  const startX = carriageX + 10;
  const car1Pos = { x: startX, y: carriageY + (carriagePx.h - carPx.h) / 2 };
  const car2Pos = {
    x: startX + carPx.w + gap,
    y: carriageY + (carriagePx.h - carPx.h) / 2
  };

  addVehicle('车A', car1Pos, carPx, carriageX, carriageY, carriagePx);
  addVehicle('车B', car2Pos, carPx, carriageX, carriageY, carriagePx);

  layer.draw();
};

function addVehicle(name, pos, carPx, carriageX, carriageY, carriagePx) {
  const group = new Konva.Group({
    x: pos.x,
    y: pos.y,
    draggable: true
  });

  const rect = new Konva.Rect({
    width: carPx.w,
    height: carPx.h,
    fill: '#dbeafe',
    stroke: '#2563eb',
    strokeWidth: 2,
    cornerRadius: 4
  });

  const label = new Konva.Text({
    x: 6,
    y: 6,
    text: `${name}\n${CAR.length}m×${CAR.width}m\n${CAR.weight_t}t`,
    fontSize: 12,
    lineHeight: 1.1,
    fill: '#0f172a'
  });

  group.add(rect);
  group.add(label);

  group.dragBoundFunc(pos => {
    const newX = Math.max(
      carriageX,
      Math.min(pos.x, carriageX + (px(CARRIAGE.length) - carPx.w))
    );
    const newY = Math.max(
      carriageY,
      Math.min(pos.y, carriageY + (px(CARRIAGE.width) - carPx.h))
    );
    return { x: newX, y: newY };
  });

  group._initialPos = { x: pos.x, y: pos.y };

  group.on('dragstart', () => {
    rect.stroke('#dc2626');
    rect.shadowColor('black');
    rect.shadowBlur(8);
    layer.draw();
  });

  group.on('dragmove', () => {
    const collided = checkAnyOverlap(group);
    rect.fill(collided ? '#fee2e2' : '#dbeafe');
    layer.batchDraw();
  });

  group.on('dragend', () => {
    rect.stroke('#2563eb');
    rect.shadowBlur(0);
    rect.fill('#dbeafe');

    const other = findOverlappingVehicle(group);
    if (other) {
      const curPos = { ...group._initialPos };
      const otherPos = { ...other._initialPos };

      new Konva.Tween({
        node: group,
        duration: 0.25,
        x: otherPos.x,
        y: otherPos.y,
        easing: Konva.Easings.EaseInOut
      }).play();

      new Konva.Tween({
        node: other,
        duration: 0.25,
        x: curPos.x,
        y: curPos.y,
        easing: Konva.Easings.EaseInOut
      }).play();

      group._initialPos = otherPos;
      other._initialPos = curPos;
    } else {
      group._initialPos = { x: group.x(), y: group.y() };
    }

    layer.batchDraw();
  });

  layer.add(group);
  vehicles.push(group);
}

// === 重叠检测 ===
function isOverlapRect(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function checkAnyOverlap(target) {
  return vehicles.some(
    v =>
      v !== target && isOverlapRect(target.getClientRect(), v.getClientRect())
  );
}

function findOverlappingVehicle(target) {
  return (
    vehicles.find(
      v =>
        v !== target && isOverlapRect(target.getClientRect(), v.getClientRect())
    ) || null
  );
}

// === 功能函数 ===
const resetPositions = () => {
  if (!vehicles.length) return;
  const carriagePx = { w: px(CARRIAGE.length), h: px(CARRIAGE.width) };
  const carriageX = (stage.width() - carriagePx.w) / 2;
  const carriageY = 60;
  const carPx = { w: px(CAR.length), h: px(CAR.width) };
  const gap = px(0.3);
  const startX = carriageX + 10;
  const car1Pos = { x: startX, y: carriageY + (carriagePx.h - carPx.h) / 2 };
  const car2Pos = {
    x: startX + carPx.w + gap,
    y: carriageY + (carriagePx.h - carPx.h) / 2
  };

  if (vehicles[0]) vehicles[0].position(car1Pos);
  if (vehicles[1]) vehicles[1].position(car2Pos);
  layer.batchDraw();
};

const onScaleChange = () => {
  if (scale.value > 5 && scale.value < 300) {
    drawStage();
  }
};

// 初始化 & 监听窗口变化
onMounted(() => {
  initStage();

  window.addEventListener('resize', () => {
    if (stage && containerRef.value) {
      stage.width(containerRef.value.clientWidth);
      stage.height(containerRef.value.clientHeight);
      drawStage();
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', drawStage);
});
</script>

<style scoped>
.carriage-container {
  margin: 18px;
  font-family: 'Microsoft Yahei', Arial, serif;
  background: #f7f7f7;
}

.canvas-box {
  width: 900px;
  height: 420px;
  background: #fff;
  border: 1px solid #ccc;
}

.controls {
  margin-bottom: 8px;
}

.info {
  margin-top: 8px;
  font-size: 14px;
}

label {
  margin-right: 10px;
}

input[type='number'] {
  width: 80px;
}
</style>
