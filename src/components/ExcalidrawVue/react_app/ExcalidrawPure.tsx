import React, { useMemo, useRef } from 'react';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type {
  ExcalidrawInitialDataState,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

import {
  useExcalidrawPatches,
  createHandleAPI
} from './utils/excalidraw-helpers';
import { debounce } from '@pureadmin/utils';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

/** ======= 对外暴露的可选回调（给 Vue 传入） ======= */
type Props = {
  /** 全量变更（已做防抖）：elements/appState/files */

  onSceneChange?: (payload: {
    elements: readonly NonDeletedExcalidrawElement[];
    appState: any;
    files: Record<string, any>;
  }) => void;

  /** 选中集合变化（已做防抖）：只在选中的元素集合发生变化时触发 */
  onSelectionChange?: (
    selected: readonly NonDeletedExcalidrawElement[]
  ) => void;
};

/** 初始样式 */
const initialData: ExcalidrawInitialDataState = {
  appState: {
    currentItemRoughness: 0, // 线条风格：非手绘
    currentItemRoundness: 'sharp', // 棱角：尖
    currentItemFontFamily: 7 // 默认字体
  }
} as const;

export default function ExcalidrawPure(props: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const initOnce = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useExcalidrawPatches();
  // 等动画结束/布局稳定后 refresh（你现有的稳定方案）
  const handleAPI = createHandleAPI(containerRef, apiRef, initOnce);
  /** 仅在“选中集合”发生变化时才触发（做个简单的数组比较） */
  const lastSelectedIds = useRef<string[]>([]);
  // 防抖后的“场景变更”回调
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

  // 防抖后的“选中集合变化”回调（只在集合改变时触发）
  const emitSelectionChange = useMemo(
    () =>
      debounce(
        (elements: readonly NonDeletedExcalidrawElement[], appState: any) => {
          const ids = Object.keys(appState?.selectedElementIds || {});
          const changed =
            ids.length !== lastSelectedIds.current.length ||
            ids.some((id, i) => id !== lastSelectedIds.current[i]);

          if (!changed) return;
          lastSelectedIds.current = ids;

          const selected = elements.filter(e => ids.includes(e.id));
          props?.onSelectionChange?.(selected);
        },
        200,
        false
      ),
    [props.onSelectionChange]
  );

  /** 唯一入口：把 Excalidraw 的 onChange 转发给外部（已做防抖） */
  const handleChange = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: any,
    files: any
  ) => {
    // @ts-ignore
    emitSceneChange(elements, appState, files);
    // @ts-ignore
    emitSelectionChange(elements, appState);
  };

  return (
    <div
      ref={containerRef}
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
        excalidrawAPI={handleAPI}
        onChange={handleChange}
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
