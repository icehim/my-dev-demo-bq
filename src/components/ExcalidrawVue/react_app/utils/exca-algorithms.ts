import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

// 获取“当前选中元素”列表
export function getSelectedElements(
  api: ExcalidrawImperativeAPI
): readonly NonDeletedExcalidrawElement[] {
  const elements = api.getSceneElements();
  const selected = api.getAppState().selectedElementIds || {};
  return elements.filter(el => !!selected[el.id]);
}

//计算一组元素的外接矩形（x/y/width/height）
export function getElementsBBox(list: readonly NonDeletedExcalidrawElement[]) {
  if (!list.length) return null;
  const minX = Math.min(...list.map(e => e.x));
  const minY = Math.min(...list.map(e => e.y));
  const maxX = Math.max(...list.map(e => e.x + e.width));
  const maxY = Math.max(...list.map(e => e.y + e.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// 获取“编组”的外接矩形
export function getGroupBoundingBox(
  api: ExcalidrawImperativeAPI,
  baseElement?: NonDeletedExcalidrawElement
) {
  const elements = api.getSceneElements();
  if (!elements.length) return null;

  // 1) 确定一个“判定基准元素”
  const selected = getSelectedElements(api);
  const el = baseElement ?? (selected.length ? selected[0] : undefined);

  if (!el) return null;

  // 2) 如果基准元素有 groupId，则按组取成员；否则就用当前选中的元素集
  const gid = el.groupIds?.[0];
  const groupEls = gid
    ? elements.filter(e => e.groupIds?.includes(gid))
    : selected;

  if (!groupEls.length) return null;

  // 3) 计算外接矩形
  const bbox = getElementsBBox(groupEls)!;
  return { ...bbox, count: groupEls.length, elements: groupEls };
}

const TWO_PI = Math.PI * 2;

// 角度归一化
function normalizeAngle(angle: number) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function circularDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, TWO_PI - diff);
}

// 元素旋转“吸附到 0 或 PI”
export function snapAngleTo0OrPI(angle: number) {
  const a = normalizeAngle(angle);

  const d0 = circularDistance(a, 0);
  const dPi = circularDistance(a, Math.PI);

  return d0 <= dPi ? 0 : Math.PI;
}
