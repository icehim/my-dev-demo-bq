import React, { useEffect, useMemo, useRef } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type {
  ExcalidrawInitialDataState,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

import {
  useExcalidrawPatches,
  createHandleAPI,
  useBlockShortcutsAndContext
} from './utils/excalidraw-helpers';
import { debounce } from '@pureadmin/utils';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

/** ======= 对外暴露的可选回调（给 Vue 传入） ======= */
export type ExcalidrawVueProps = {
  //Excalidraw 实例
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  /** 全量变更（已做防抖）：elements/appState/files */
  onSceneChange?: (payload: {
    elements: readonly NonDeletedExcalidrawElement[];
    appState: any;
    files: Record<string, any>;
  }) => void;
  onExternalImageDropSuccess?: (payload: any) => void;
  onElementsDeleted?: (payload: {
    deleted: Array<{
      elementId: string;
      type: string;
      customData?: any;
    }>;
  }) => void;
  /** 是否让 Excalidraw 接管全局键盘（默认 false） */
  handleKeyboardGlobally?: boolean;
  /** 是否拦截快捷键（默认 false） */
  blockShortcuts?: boolean;
  /** 是否拦截右键/菜单（默认 false） */
  blockContextMenu?: boolean;
  /* 是否拦截左键双击菜单 */
  blockDoubleClick?: boolean;
};

/** 初始样式 */
const initialData: ExcalidrawInitialDataState = {
  appState: {
    currentItemRoughness: 0, // 线条风格：非手绘
    currentItemRoundness: 'sharp', // 棱角：尖
    currentItemFontFamily: 7 // 默认字体
  }
} as const;

export default function ExcalidrawPure(props: ExcalidrawVueProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const initOnce = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // 用来记上次 isDeleted 状态，防重复
  const prevDeletedMapRef = useRef<Map<string, boolean>>(new Map());
  // drop 时拿到的 payload（来自 el-tree img dragstart）
  const lastDropPayloadRef = useRef<any>(null);

  // 记录上一次 elements ids，用于找“新增元素”
  const lastIdsRef = useRef<Set<string>>(new Set());

  // 记录“这次 drop 新增的 image 元素 id”，等 fileId 回填后再 patch
  const pendingImageIdsRef = useRef<Set<string>>(new Set());

  useExcalidrawPatches();
  // 是否拦截快捷键/右键（默认都开启,不拦截）
  useBlockShortcutsAndContext(containerRef, {
    blockKeyboard: props.blockShortcuts ?? false,
    blockContextMenu: props.blockContextMenu ?? false,
    blockRightClick: props.blockContextMenu ?? false,
    blockDoubleClick: props.blockDoubleClick ?? false
  });
  // 等动画结束/布局稳定后 refresh
  const handleAPI = createHandleAPI(containerRef, apiRef, initOnce);

  const emitSceneChange = useMemo(
    () =>
      debounce(
        (
          elements: readonly NonDeletedExcalidrawElement[],
          appState: any,
          files: any
        ) => {
          props.onSceneChange?.({ elements, appState, files });
        },
        300,
        false // 末尾触发
      ),
    [props.onSceneChange]
  );

  // ✅ 1) drop 捕获：从 dataTransfer 读取你在 tree dragstart 写入的 payload
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDropCapture = (e: DragEvent) => {
      const raw = e.dataTransfer?.getData('application/x-tree-image');
      if (!raw) {
        lastDropPayloadRef.current = null;
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.kind === 'TREE_IMAGE') {
          lastDropPayloadRef.current = parsed;
        } else {
          lastDropPayloadRef.current = null;
        }
      } catch {
        lastDropPayloadRef.current = null;
      }
    };

    el.addEventListener('drop', onDropCapture, true); // capture=true 很重要
    return () => el.removeEventListener('drop', onDropCapture, true);
  }, []);

  // ✅ 2) onChange：等 fileId 回填后再 patch customData
  const handleChange = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: any,
    files: any
  ) => {
    const prevMap = prevDeletedMapRef.current;
    const deletedFromTree: Array<any> = [];

    for (const el of elements as any[]) {
      const prev = prevMap.get(el.id) ?? false;
      const curr = !!el.isDeleted;

      // 只抓 “第一次变成 deleted”
      if (!prev && curr) {
        if (el.customData?.fromTree === true) {
          deletedFromTree.push(el);
        }
      }

      prevMap.set(el.id, curr);
    }

    if (deletedFromTree.length) {
      props.onElementsDeleted?.({
        deleted: deletedFromTree.map(el => ({
          elementId: el.id,
          type: el.type,
          customData: el.customData
        }))
      });
    }

    // 先透传给 Vue（你原来的逻辑）
    // @ts-ignore
    emitSceneChange(elements, appState, files);

    const payload = lastDropPayloadRef.current;

    // 更新 lastIdsRef，拿到新增元素
    const prevIds = lastIdsRef.current;
    const nowIds = new Set(elements.map(el => el.id));
    lastIdsRef.current = nowIds;

    if (!payload || payload.kind !== 'TREE_IMAGE') {
      return;
    }

    // 2.1 第一次：记录新增 image 的 id（此时 fileId 可能为 null）
    const added = elements.filter(el => !prevIds.has(el.id));
    const addedImages = added.filter((el: any) => el.type === 'image');
    addedImages.forEach((img: any) => {
      // 只要是 image 就先记住，等 fileId
      pendingImageIdsRef.current.add(img.id);
    });

    // 2.2 后续：扫描 pending 的 image，一旦 fileId 回填，补 customData
    const toPatch = elements.filter((el: any) => {
      return (
        el.type === 'image' &&
        pendingImageIdsRef.current.has(el.id) &&
        !!el.fileId && // ⭐ 关键：等 fileId 真正出现
        !el.customData?.fromTree
      );
    });

    if (!toPatch.length || !apiRef.current) return;
    props.onExternalImageDropSuccess?.(payload);

    const patched = elements.map((el: any) => {
      const hit = toPatch.find((x: any) => x.id === el.id);
      if (!hit) return el;

      pendingImageIdsRef.current.delete(el.id);

      return {
        ...el,
        customData: {
          ...(el.customData ?? {}),
          fromTree: true,
          ...payload
        }
      };
    });

    apiRef.current.updateScene({ elements: patched as any });

    // 一次拖拽通常只对应一张图：patch 成功后清 payload
    // 如果你可能一次 drop 多张图或连续快速拖，建议改成 Map 队列，我也可以给你升级版
    lastDropPayloadRef.current = null;
  };

  const handleAPIWithExpose = (api: ExcalidrawImperativeAPI) => {
    handleAPI(api);
    props.onApiReady?.(api);
  };

  const className =
    props.blockShortcuts && props.blockContextMenu ? 'excalidraw-readonly' : '';

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: '100%',
        width: '1200px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <Excalidraw
        langCode="zh-CN"
        initialData={initialData}
        excalidrawAPI={handleAPIWithExpose}
        onChange={handleChange}
        handleKeyboardGlobally={props.handleKeyboardGlobally ?? false}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
