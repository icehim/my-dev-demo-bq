<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { onMounted, ref } from 'vue';
import type {
  AppState,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import img_car1 from '@/assets/svg/吊车.svg?raw';
import img_car2 from '@/assets/svg/货车.svg?raw';
import img_car3 from '@/assets/svg/坦克.svg?raw';
import img_car4 from '@/assets/svg/指挥车.svg?raw';
import img_car5 from '@/assets/svg/装甲车.svg?raw';

type TreeNode = {
  id: string;
  name?: string;
  imgUrl?: string; // 给 <img> 用（string）
  dragFile?: File; // 拖拽用（File）
  type?: string;
  wzmc?: string;
  zbmc?: string;
  count?: number;
  children?: TreeNode[];
  jzch?: TreeNode[];
};
const COLOR_MAP: Record<string, string> = {
  car1: '#FF3B30',
  car2: '#34C759',
  car3: '#007AFF',
  car4: '#AF52DE',
  car5: '#FF9500'
};
const apiRef = ref<ExcalidrawImperativeAPI | null>(null);
const treeProps = { children: 'children', label: 'name' };

//给 <svg> 注入 style="color: xxx"
function tintSvgWithCurrentColor(svgText: string, color: string) {
  // 如果已经有 style，就补 color
  if (/<svg[^>]*style=/.test(svgText)) {
    return svgText.replace(
      /<svg([^>]*)style=['"]([^'"]*)['"]/,
      `<svg$1style="$2;color:${color};"`
    );
  }

  // 否则直接加 style
  return svgText.replace(/<svg\b([^>]*)>/, `<svg$1 style="color:${color};">`);
}

function svgTextToFile(svgText: string, filename: string) {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  return new File([blob], filename, { type: 'image/svg+xml' });
}
function onApiReady(api: ExcalidrawImperativeAPI) {
  apiRef.value = api;
  console.log('API 就绪', api);
}
function getColoredSvgTextByType(type: string) {
  // 这里 img_car1..5 必须是 svg 字符串
  const raw =
    type === 'car1'
      ? img_car1
      : type === 'car2'
        ? img_car2
        : type === 'car3'
          ? img_car3
          : type === 'car4'
            ? img_car4
            : img_car5;

  const color = COLOR_MAP[type] ?? '#333';
  return tintSvgWithCurrentColor(raw as unknown as string, color);
}

function handleSceneChange(payload: {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  files: Record<string, any>;
}) {
  console.log(payload.elements);
}

const treeData = ref<TreeNode[]>([]);

function svgTextToDataUrl(svgText: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}
function normalizeTreeWithLeafCount(tree: TreeNode[]) {
  const walk = (node: TreeNode): TreeNode => {
    const next: TreeNode = { ...node };

    if (next.wzmc || next.zbmc) {
      next.name = next.wzmc ?? next.zbmc;
      delete next.wzmc;
      delete next.zbmc;
    }

    const children = Array.isArray(next.children) ? next.children : [];
    const jzch = Array.isArray(next.jzch) ? next.jzch : [];

    if (jzch.length > 0) {
      next.children = [...children, ...jzch];
      delete next.jzch;
    } else if (children.length > 0) {
      next.children = children;
    }

    if (Array.isArray(next.children) && next.children.length > 0) {
      next.children = next.children.map(walk);
      next.count = next.children.reduce(
        (sum: number, c: TreeNode) => sum + (c.count ?? 0),
        0
      );
    } else {
      next.count = 1;
      const coloredSvgText = getColoredSvgTextByType(next.type);
      // ✅ 给树展示用
      next.imgUrl = svgTextToDataUrl(coloredSvgText);
      // ✅ 给拖拽用（Firefox 关键）
      next.dragFile = svgTextToFile(
        coloredSvgText,
        `${next.type}-${next.id}.svg`
      );
    }

    return next;
  };

  return tree.map(walk);
}

function onImgDragStart(e: DragEvent, data: TreeNode) {
  if (!e.dataTransfer) return;

  e.dataTransfer.setData(
    'application/x-tree-image',
    JSON.stringify({ kind: 'TREE_IMAGE', ...data })
  );

  // ✅ 关键：塞真实 File（你 normalize 时已经生成好了）
  if (data.dragFile) {
    try {
      e.dataTransfer.items.add(data.dragFile);
    } catch (err) {
      console.warn('items.add(file) failed', err);
    }
  } else {
    // 没有 dragFile 就不让拖（否则 Firefox 导不进）
    e.preventDefault();
  }

  e.dataTransfer.effectAllowed = 'copy';
}

function onElementsDeleted(payload: { deleted: any[] }) {
  console.log('删除', payload);
}
function onExternalImageDropSuccess(payload: any) {
  console.log('添加', payload);
}

onMounted(async () => {
  const data = [
    {
      id: '1',
      name: '装备1队',
      children: [
        { id: '1', wzmc: '工程1', type: 'car1' },
        { id: '2', zbmc: '货车', type: 'car2' },
        { id: '3', wzmc: '坦克', type: 'car3' },
        { id: '4', zbmc: '指挥车', type: 'car4' },
        { id: '5', wzmc: '装甲车', type: 'car5' }
      ]
    },
    {
      id: '2',
      name: '装备2队',
      children: [
        { id: '21', wzmc: '工程1', type: 'car1' },
        { id: '22', zbmc: '货车', type: 'car2' },
        { id: '23', wzmc: '坦克', type: 'car3' },
        { id: '24', zbmc: '指挥车', type: 'car4' },
        { id: '25', wzmc: '装甲车', type: 'car5' }
      ]
    }
  ];
  // 调接口返回树数据（这里用示例数据）
  treeData.value = normalizeTreeWithLeafCount(data);
});
</script>

<template>
  <div class="h-full w-full relative">
    <excalidraw-vue
      :onApiReady="onApiReady"
      :onSceneChange="handleSceneChange"
      :onElementsDeleted="onElementsDeleted"
      :onExternalImageDropSuccess="onExternalImageDropSuccess"
      :blockShortcuts="true"
      :blockContextMenu="true"
      :blockDoubleClick="true"
    />
    <el-tree
      :data="treeData"
      :props="treeProps"
      class="tree-style"
      node-key="id"
      default-expand-all
    >
      <template #default="{ data }">
        <div class="flex items-center gap-2">
          <img
            v-if="!data.children && !data.children?.length"
            :src="data.imgUrl"
            draggable="true"
            style="width: 24px; height: 24px; object-fit: contain"
            @dragstart="e => onImgDragStart(e, data)"
          />
          <span>{{ data.name }}</span>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<style scoped lang="scss">
.tree-style {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2;
  border: 1px solid red;
}
</style>
