<script setup lang="ts">
import ExcalidrawVue from '@/components/ExcalidrawVue';
import { onMounted, ref } from 'vue';
import type {
  AppState,
  BinaryFileData,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement
} from '@excalidraw/excalidraw/element/types';

import img_car1 from '@/assets/svg/吊车.svg?raw';
import img_car2 from '@/assets/svg/货车.svg?raw';
import img_car3 from '@/assets/svg/坦克.svg?raw';
import img_car4 from '@/assets/svg/指挥车.svg?raw';
import img_car5 from '@/assets/svg/装甲车.svg?raw';
import { equipmentElements, equipmentFiles } from '@/views/sea/excalidraw/data';
const apiRef = ref<ExcalidrawImperativeAPI | null>(null);
const treeProps = { children: 'children', label: 'name' };
const treeData = ref<TreeNode[]>([]);

function handleSceneChange(payload: {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  files: Record<string, any>;
}) {
  console.log(payload.elements);
  console.log(payload.files);
}

function onApiReady(api: ExcalidrawImperativeAPI) {
  apiRef.value = api;
  console.log('API 就绪', api);
  mockData();
}

const mockData = () => {
  setTimeout(() => {
    const api = apiRef.value!;
    api.addFiles(equipmentFiles as unknown as BinaryFileData[]);
    api.updateScene({
      elements: equipmentElements as unknown as ExcalidrawElement[]
    });
  }, 200);
};

type TreeNode = {
  id: string;
  name?: string;
  imgUrl?: string;
  dragFile?: File;
  type?: 'car1' | 'car2' | 'car3' | 'car4' | 'car5';
  wzmc?: string;
  zbmc?: string;
  count?: number;
  children?: TreeNode[];
  jzch?: TreeNode[];
};

const PALETTE = [
  '#FF3B30',
  '#34C759',
  '#007AFF',
  '#AF52DE',
  '#FF9500',
  '#FF2D55',
  '#5856D6',
  '#00C7BE',
  '#FFCC00',
  '#8E8E93',
  '#A2845E',
  '#30D158',
  '#64D2FF',
  '#BF5AF2',
  '#FFD60A'
];

const parentColorMap = new Map<string, string>();
function colorByParentId(parentId: string) {
  const hit = parentColorMap.get(parentId);
  if (hit) return hit;
  const color = PALETTE[parentColorMap.size % PALETTE.length];
  parentColorMap.set(parentId, color);
  return color;
}

function getRawSvgByType(type: NonNullable<TreeNode['type']>) {
  return type === 'car1'
    ? img_car1
    : type === 'car2'
      ? img_car2
      : type === 'car3'
        ? img_car3
        : type === 'car4'
          ? img_car4
          : img_car5;
}

function replaceCurrentColor(svgText: string, color: string) {
  let out = svgText.replace(/fill=(['"])currentColor\1/gi, `fill="${color}"`);
  out = out.replace(/stroke=(['"])currentColor\1/gi, `stroke="${color}"`);
  return out;
}

function svgTextToFile(svgText: string, filename: string) {
  return new File([svgText], filename, { type: 'image/svg+xml' });
}

function svgTextToDataUrl(svgText: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}

const coloredCache = new Map<string, { imgUrl: string; dragFile: File }>();
function getColoredAssets(rawSvg: string, color: string, filename: string) {
  const key = `${color}::${filename}`;
  const hit = coloredCache.get(key);
  if (hit) return hit;
  const svgText = replaceCurrentColor(rawSvg, color);
  const val = {
    imgUrl: svgTextToDataUrl(svgText),
    dragFile: svgTextToFile(svgText, filename)
  };
  coloredCache.set(key, val);
  return val;
}

function normalizeTreeWithLeafCount(tree: TreeNode[]) {
  const walk = (node: TreeNode, parentId?: string): TreeNode => {
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

    const hasKids = Array.isArray(next.children) && next.children.length > 0;

    if (hasKids) {
      next.children = next.children!.map(c => walk(c, next.id));
      next.count = next.children!.reduce((sum, c) => sum + (c.count ?? 0), 0);
    } else {
      next.count = 1;
      const t = next.type ?? 'car1';
      const raw = getRawSvgByType(t);
      const keyParentId = parentId ?? next.id; // 顶层直接是叶子时兜底
      const color = colorByParentId(keyParentId);
      const { imgUrl, dragFile } = getColoredAssets(
        raw as unknown as string,
        color,
        `${t}-${next.id}.svg`
      );
      next.imgUrl = imgUrl;
      next.dragFile = dragFile;
    }

    return next;
  };

  parentColorMap.clear();
  coloredCache.clear();
  return tree.map(root => walk(root, undefined));
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
    },
    {
      id: '3',
      name: '3队',
      children: [
        {
          id: '33',
          name: '3-3队',
          children: [
            { id: '31', wzmc: '工程1', type: 'car1' },
            { id: '32', zbmc: '货车', type: 'car2' },
            { id: '33', wzmc: '坦克', type: 'car3' },
            { id: '34', zbmc: '指挥车', type: 'car4' },
            { id: '35', wzmc: '装甲车', type: 'car5' }
          ]
        },
        {
          id: '43',
          name: '4-3队',
          children: [
            { id: '41', wzmc: '工程1', type: 'car1' },
            { id: '42', zbmc: '货车', type: 'car2' },
            { id: '43', wzmc: '坦克', type: 'car3' },
            { id: '44', zbmc: '指挥车', type: 'car4' },
            { id: '45', wzmc: '装甲车', type: 'car5' }
          ]
        }
      ]
    }
  ];
  // 调接口返回树数据（这里用示例数据）
  treeData.value = normalizeTreeWithLeafCount(data as unknown as any);
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
