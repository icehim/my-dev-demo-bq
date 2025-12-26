import { useEffect } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

/** ===== 文案映射（可按需增删） ===== */
export const TEXT_MAP: Record<string, string> = {
  'Toggle grid': '网格线',
  'Canvas & Shape properties': '详细统计信息',
  禅模式: '绘图模式'
};

/** ===== DOM 工具：找到最近的“有动画/过渡/transform”的祖先 ===== */
export function findAnimatedAncestor(
  start: HTMLElement | null
): HTMLElement | null {
  let n: HTMLElement | null = start;
  while (n) {
    const cs = getComputedStyle(n);
    const hasTransition =
      cs.transitionDuration !== '0s' && cs.transitionProperty !== 'all, none';
    const hasAnimation = cs.animationName !== 'none';
    const hasTransform = cs.transform && cs.transform !== 'none';
    if (hasTransition || hasAnimation || hasTransform) return n;
    n = n.parentElement;
  }
  return start;
}

/** ===== DOM 工具：等待“布局稳定”（两帧尺寸一致） ===== */
export function waitLayoutStable(el: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    let last: DOMRect | null = null;
    let stableFrames = 0;
    const step = () => {
      const r = el.getBoundingClientRect();
      if (last && r.width === last.width && r.height === last.height)
        stableFrames++;
      else stableFrames = 0;
      last = r;
      if (stableFrames >= 2) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** ===== 补丁：右键菜单文本替换 ===== */
export function replaceContextMenuTexts(root: ParentNode = document) {
  const nodes = root.querySelectorAll<HTMLElement>(
    '.excalidraw .context-menu-item__label'
  );
  nodes.forEach(n => {
    const raw = n.textContent?.trim();
    if (!raw) return;
    const mapped = TEXT_MAP[raw];
    if (mapped && raw !== mapped) n.textContent = mapped;
  });
}

/** ===== 补丁：帮助弹窗文本替换 ===== */
export function replaceHelpDialogTexts(root: ParentNode = document) {
  const rows = root.querySelectorAll('.excalidraw .HelpDialog__shortcut');
  rows.forEach(row => {
    const labelDiv = (row as HTMLElement).querySelector<HTMLDivElement>(
      ':scope > div:first-child'
    );
    if (!labelDiv) return;
    const raw = labelDiv.textContent?.trim();
    if (!raw) return;
    const mapped = TEXT_MAP[raw];
    if (mapped && raw !== mapped) labelDiv.textContent = mapped;
  });
}
/** ===== 补丁：隐藏撤销重做按钮 ===== */
function ensureHideUndoRedoStyle() {
  const id = 'excalidraw-hide-undo-redo';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;

  // 注意：选择器可能因版本不同略有差异，所以给多个兜底
  style.textContent = `
/* 兜底1：底部浮动操作区里的 undo/redo（常见） */
.excalidraw .App-toolbar__undo-redo,
.excalidraw .undo-redo-buttons,
.excalidraw [data-testid="undo-button"],
.excalidraw [data-testid="redo-button"] {
  display: none !important;
}

/* 兜底2：如果 undo/redo 在 footer/toolbar 里 */
.excalidraw footer [data-testid="undo-button"],
.excalidraw footer [data-testid="redo-button"],
.excalidraw .footer [data-testid="undo-button"],
.excalidraw .footer [data-testid="redo-button"] {
  display: none !important;
}
`;
  document.head.appendChild(style);
}

/** ===== 组合：统一跑所有补丁 ===== */
export function runAllPatches(root: ParentNode = document) {
  replaceContextMenuTexts(root);
  replaceHelpDialogTexts(root);
  ensureHideUndoRedoStyle();
}

/** ===== React 风格的“补丁挂载”hook（像 Vue 的 onMounted + watcher） ===== */
export function useExcalidrawPatches() {
  useEffect(() => {
    const mo = new MutationObserver(() => runAllPatches(document));
    mo.observe(document.body, { childList: true, subtree: true });
    runAllPatches(document); // 首次也跑一次
    return () => mo.disconnect();
  }, []);
}

/** ===== 生成 excalidrawAPI 回调：等动画结束/布局稳定后 refresh =====
 * 用法：const handleAPI = createHandleAPI(containerRef, apiRef, initOnceRef)
 */
export function createHandleAPI(
  containerRef: React.RefObject<HTMLDivElement>,
  apiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>,
  initOnceRef: React.MutableRefObject<boolean>
) {
  return (api: ExcalidrawImperativeAPI) => {
    if (initOnceRef.current) return;
    initOnceRef.current = true;
    apiRef.current = api;

    const el = containerRef.current!;
    const animatedRoot = findAnimatedAncestor(el) || el;

    const doRefresh = () => {
      waitLayoutStable(el).then(() => api.refresh?.());
    };

    // 有动画/过渡时：等结束事件
    const onEnd = () => {
      animatedRoot.removeEventListener('transitionend', onEnd);
      animatedRoot.removeEventListener('animationend', onEnd);
      doRefresh();
    };
    animatedRoot.addEventListener('transitionend', onEnd);
    animatedRoot.addEventListener('animationend', onEnd);

    // 尺寸变化也刷新（比如侧栏开合）
    const ro = new ResizeObserver(() => api.refresh?.());
    ro.observe(el);

    // 首帧兜底（无动画时也能正常）
    requestAnimationFrame(() => api.refresh?.());

    // 最终兜底：1s 内没有任何事件，强制再刷一次（某些主题不派发 end）
    setTimeout(doRefresh, 1000);
  };
}

/** 禁用快捷键 & 右键 & 左键双击（容器级，捕获阶段拦截） */

type BlockOpts = {
  blockKeyboard?: boolean;
  blockContextMenu?: boolean;
  blockRightClick?: boolean;
  blockDoubleClick?: boolean;
};

export function useBlockShortcutsAndContext(
  containerRef: React.RefObject<HTMLElement>,
  opts: BlockOpts = {
    blockKeyboard: false,
    blockContextMenu: false,
    blockRightClick: false,
    blockDoubleClick: false
  }
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stopAll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const stopProp = (e: Event) => {
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        // e.key === 'Delete' ||
        e.key === 'Backspace' ||
        e.key === 'Escape' ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        stopAll(e);
      }
    };

    // ✅ 右键按下：只拦传播，别 preventDefault（避免误伤 dblclick）
    const onPointerDown = (e: PointerEvent) => {
      const isRight = e.button === 2 || ((e.buttons ?? 0) & 2) === 2;
      if (!isRight) return;
      stopProp(e);
    };

    // ✅ 左键双击拦截（只拦画布区）
    const onDblClick = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;

      // 放行输入/编辑区域
      if (target?.closest?.("input, textarea, [contenteditable='true']"))
        return;

      // 只拦画布
      const inCanvas = !!target?.closest?.('.excalidraw__canvas');
      if (!inCanvas) return;

      stopAll(e);
    };

    // ===== 绑定 =====
    if (opts.blockKeyboard)
      el.addEventListener('keydown', onKeyDown, { capture: true });

    if (opts.blockContextMenu)
      el.addEventListener('contextmenu', stopAll, { capture: true });

    if (opts.blockRightClick)
      el.addEventListener('pointerdown', onPointerDown, { capture: true });

    if (opts.blockDoubleClick)
      el.addEventListener('dblclick', onDblClick, { capture: true });

    // 下拉菜单兜底
    const killDropdown = (ev: Event) => {
      const target = ev.target as HTMLElement;
      if (target?.closest?.('.excalidraw .dropdown-menu')) stopAll(ev);
    };
    document.addEventListener('pointerdown', killDropdown, { capture: true });
    document.addEventListener('contextmenu', killDropdown, { capture: true });

    return () => {
      if (opts.blockKeyboard)
        el.removeEventListener('keydown', onKeyDown, { capture: true } as any);

      if (opts.blockContextMenu)
        el.removeEventListener('contextmenu', stopAll, {
          capture: true
        } as any);

      if (opts.blockRightClick)
        el.removeEventListener('pointerdown', onPointerDown, {
          capture: true
        } as any);

      if (opts.blockDoubleClick)
        el.removeEventListener('dblclick', onDblClick, {
          capture: true
        } as any);

      document.removeEventListener('pointerdown', killDropdown, {
        capture: true
      } as any);
      document.removeEventListener('contextmenu', killDropdown, {
        capture: true
      } as any);
    };
  }, [
    containerRef,
    opts.blockKeyboard,
    opts.blockContextMenu,
    opts.blockRightClick,
    opts.blockDoubleClick
  ]);
}
