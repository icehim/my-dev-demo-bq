<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { reactive, ref } from 'vue';
import type {
  AppState,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';

import {
  getElementsBBox,
  getGroupBoundingBox
} from '@/components/ExcalidrawVue/react_app/utils/exca-algorithms';
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement
} from '@excalidraw/excalidraw/element/types';

const detailForm = reactive({
  attribute: '',
  name: '',
  length: '',
  width: ''
});

const shapeForm = reactive({
  count: '',
  x: '',
  y: '',
  length: '',
  width: ''
});

// 可选：保留 api，后面如果需要 updateScene/写回画布会用到
const apiRef = ref<ExcalidrawImperativeAPI>(null);
function onApiReady(api: any) {
  apiRef.value = api;
  console.log('API 就绪', api);
  mockData();
}

const mockData = () => {
  setTimeout(() => {
    apiRef.value.updateScene({
      elements: [
        {
          type: 'rectangle',
          id: 'rect-001',
          x: 100,
          y: 80,
          width: 200,
          height: 120,
          angle: 0,
          strokeColor: '#1e1e1e',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          roundness: null,
          groupIds: []
        } as unknown
      ] as ExcalidrawElement[]
    });
  }, 200);
};

// 小工具：数字转字符串（四舍五入），你也可以保留小数：v.toFixed(2)
const n = (v: number) => String(Math.round(v));

function handleSceneChange(payload: {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  files: Record<string, any>;
}) {
  console.log(payload.elements);
  const { elements, appState } = payload;
  // 1) 取选中集
  const ids = Object.keys(appState.selectedElementIds || {});
  const selected = ids.length ? elements.filter(e => ids.includes(e.id)) : [];

  // 2) 填表单：数量
  shapeForm.count = String(selected.length);

  if (!selected.length) {
    // 清空
    shapeForm.count =
      shapeForm.x =
      shapeForm.y =
      shapeForm.length =
      shapeForm.width =
        '';
    return;
  }

  // 3) 单选且该元素在某编组内 → 优先算编组外接框
  if (selected.length === 1 && selected[0].groupIds?.length) {
    const info = apiRef.value
      ? getGroupBoundingBox(apiRef.value, selected[0])
      : null;
    if (info) {
      shapeForm.x = n(info.x);
      shapeForm.y = n(info.y);
      shapeForm.length = n(info.height);
      shapeForm.width = n(info.width);
      return;
    }
    // 如果没拿到 api 或没找到组，就降级走选中集外接框
  }

  // 4) 多选/普通单选：按当前选中集计算外接框
  const bbox = getElementsBBox(selected);
  if (bbox) {
    shapeForm.x = n(bbox.x);
    shapeForm.y = n(bbox.y);
    shapeForm.length = n(bbox.height);
    shapeForm.width = n(bbox.width);
  }
}
const handleTest = () => {
  console.log(111111);
};
</script>

<template>
  <div class="h-full w-full flex gap-[8px]">
    <excalidraw-vue
      :onApiReady="onApiReady"
      :onSceneChange="handleSceneChange"
      :blockShortcuts="true"
      :blockContextMenu="true"
    />
    <el-card class="w-[calc(100%-1208px)]" shadow="never">
      <el-card shadow="never" header="详细信息">
        <el-form :model="detailForm" label-width="auto">
          <el-form-item label="属性">
            <el-input v-model="detailForm.attribute" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="detailForm.name" />
          </el-form-item>
          <el-form-item label="长度">
            <el-input v-model="detailForm.length" />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input v-model="detailForm.width" />
          </el-form-item>
        </el-form>
      </el-card>
      <el-card shadow="never" header="编组" class="mt-[16px]">
        <el-form :model="shapeForm" label-width="auto">
          <el-form-item label="元素数量">
            <el-input v-model="shapeForm.count" />
          </el-form-item>
          <el-form-item label="X坐标">
            <el-input v-model="shapeForm.x" />
          </el-form-item>
          <el-form-item label="Y坐标">
            <el-input v-model="shapeForm.y" />
          </el-form-item>
          <el-form-item label="长度">
            <el-input v-model="shapeForm.length" />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input v-model="shapeForm.width" />
          </el-form-item>
        </el-form>
      </el-card>
      <el-button type="primary" @click="handleTest">测试</el-button>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-card__header) {
  padding: 8px 12px;
}

:deep(.el-card__body) {
  padding: 8px;
}
</style>
