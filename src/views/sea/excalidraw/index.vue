<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { reactive, ref } from 'vue';
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
  console.log('change', payload);
}
function onApiReady(api: any) {
  // 有需要的话把 api 存起来，后面做 updateScene/移动等
  console.log('API 就绪', api);
}
</script>

<template>
  <div class="h-full w-full flex gap-[8px]">
    <excalidraw-vue
      :onApiReady="onApiReady"
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
