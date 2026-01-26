<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { onMounted, ref } from 'vue';
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

const leafFileRef = ref<File | null>(null);

async function preloadLeafFile() {
  if (leafFileRef.value) return;
  const url = new URL(img, window.location.href).href;
  const res = await fetch(url);
  const blob = await res.blob();
  leafFileRef.value = new File([blob], 'leaf.png', {
    type: blob.type || 'image/png'
  });
}
type AnyNode = Record<string, any>;
function normalizeTreeWithLeafCount(tree: AnyNode[]) {
  const walk = (node: AnyNode): AnyNode => {
    const next: AnyNode = { ...node };

    // 1) wzmc / zzmc -> name
    if (next.wzmc || next.zzmc) {
      next.name = next.wzmc ?? next.zzmc;
      delete next.wzmc;
      delete next.zzmc;
    }

    // 2) jzch 合并到 children
    const children = Array.isArray(next.children) ? next.children : [];
    const jzch = Array.isArray(next.jzch) ? next.jzch : [];

    if (jzch.length > 0) {
      next.children = [...children, ...jzch];
      delete next.jzch;
    } else if (children.length > 0) {
      next.children = children;
    }

    // 3) 递归 + 叶子数量 + 叶子 imgUrl
    if (Array.isArray(next.children) && next.children.length > 0) {
      next.children = next.children.map(walk);
      next.count = next.children.reduce(
        (sum: number, c: AnyNode) => sum + (c.count ?? 0),
        0
      );
    } else {
      // 🌿 叶子节点
      next.count = 1;
      // next.imgUrl = 'https://xxx.com/leaf.png';
      next.imgUrl = img;
    }

    return next;
  };

  return tree.map(walk);
}

function onImgDragStart(e: DragEvent, data) {
  if (!e.dataTransfer || !data.imgUrl) return;

  const url = new URL(data.imgUrl, window.location.href).href;

  e.dataTransfer.setData('text/uri-list', url);
  e.dataTransfer.setData('text/plain', url);
  e.dataTransfer.setData('text/x-moz-url', `${url}\n${data.name ?? ''}`);

  e.dataTransfer.setData(
    'application/x-tree-image',
    JSON.stringify({
      kind: 'TREE_IMAGE',
      ...data
    })
  );

  // ✅ 关键：Firefox 依赖真实 File
  const file = leafFileRef.value;
  if (file) {
    try {
      e.dataTransfer.items.add(file);
    } catch (err) {
      console.warn('items.add(file) failed', err);
    }
  } else {
    // 兜底：没预加载好就阻止拖拽（否则 Firefox 可能导不进）
    e.preventDefault();
    preloadLeafFile();
  }

  e.dataTransfer.effectAllowed = 'copy';
}

function onElementsDeleted(payload: { deleted: any[] }) {
  console.log('删除', payload);
}
function onExternalImageDropSuccess(payload) {
  console.log('添加', payload);
}
onMounted(async () => {
  // 调接口返回树数据
  await preloadLeafFile();
});
</script>

<template>
  <div class="h-full w-full flex gap-[8px]">
    <excalidraw-vue
      :onApiReady="onApiReady"
      :onSceneChange="handleSceneChange"
      :onElementsDeleted="onElementsDeleted"
      :onExternalImageDropSuccess="onExternalImageDropSuccess"
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
