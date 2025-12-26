<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { ref } from 'vue';
import type {
  AppState,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
type TreeNode = {
  id: string;
  label: string;
  imgUrl: string;
  children?: TreeNode[];
};
import img from '@/assets/user.jpg';
const apiRef = ref<ExcalidrawImperativeAPI | null>(null);

function onApiReady(api: ExcalidrawImperativeAPI) {
  apiRef.value = api;
  console.log('API 就绪', api);
}

function handleSceneChange(payload: {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  files: Record<string, any>;
}) {
  // 这里你可以读 element.customData.fromTree / nodeId 等
  console.log(payload.elements);
}

// ====== el-tree 示例数据 ======
const treeData: TreeNode[] = [
  {
    id: 'n1',
    label: '头像1',
    imgUrl: img
  },
  {
    id: 'n2',
    label: '头像2',
    imgUrl: img
  }
];

const treeProps = {
  children: 'children',
  label: 'label'
};

// ====== 只拖图片：dragstart ======
function onImgDragStart(e: DragEvent, data: TreeNode) {
  if (!e.dataTransfer) return;

  // 让 Excalidraw 把它识别为外部图片
  e.dataTransfer.setData('text/uri-list', data.imgUrl);
  e.dataTransfer.setData('text/plain', data.imgUrl);

  // 你的业务 payload：给 React 那边 drop 捕获用
  e.dataTransfer.setData(
    'application/x-tree-image',
    JSON.stringify({
      kind: 'TREE_IMAGE',
      nodeId: data.id,
      label: data.label,
      imageUrl: data.imgUrl
    })
  );

  // 可选：拖拽效果
  e.dataTransfer.effectAllowed = 'copy';
}
</script>

<template>
  <div class="h-full w-full flex gap-[8px]">
    <excalidraw-vue
      :onApiReady="onApiReady"
      :onSceneChange="handleSceneChange"
      :blockShortcuts="true"
      :blockContextMenu="true"
      :blockDoubleClick="true"
    />
    <el-tree :data="treeData" :props="treeProps">
      <template #default="{ data }">
        <div class="flex items-center gap-2">
          <img
            :src="data.imgUrl"
            draggable="true"
            style="width: 24px; height: 24px; object-fit: contain"
            @dragstart="e => onImgDragStart(e, data)"
          />
          <span>{{ data.label }}</span>
        </div>
      </template>
    </el-tree>
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
