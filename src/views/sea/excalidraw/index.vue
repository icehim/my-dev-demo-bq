<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { reactive } from 'vue';
import type { AppState } from '@excalidraw/excalidraw/types';
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

function handleSceneChange(payload: {
  elements: any[];
  appState: AppState;
  files: Record<string, any>;
}) {
  console.log('vue场景（防抖）:', payload.appState.selectedElementIds);
}
const n = (v: number) => String(Math.round(v)); // 或者保留小数：v.toFixed(2)
function handleSelectionChange(selected: any[]) {
  if (selected.length === 0) {
    // 清空
    shapeForm.x = '';
    shapeForm.y = '';
    shapeForm.length = '';
    shapeForm.width = '';
    return;
  }

  if (selected.length === 1) {
    const el = selected[0];
    // 注意：Excalidraw 的元素都有 x/y/width/height（线段/箭头也有外接矩形）
    shapeForm.x = n(el.x);
    shapeForm.y = n(el.y);
    shapeForm.length = n(el.height);
    shapeForm.width = n(el.width);
    return;
  }
  console.log('选中（防抖，仅集合变化触发）:', selected);
}
</script>

<template>
  <div class="h-full w-full flex gap-[8px]">
    <excalidraw-vue
      :onSelectionChange="handleSelectionChange"
      :onSceneChange="handleSceneChange"
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
