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
export type ExcalidrawVueProps = {
  //Excalidraw 实例
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  /** 全量变更（已做防抖）：elements/appState/files */
  onSceneChange?: (payload: {
    elements: readonly NonDeletedExcalidrawElement[];
    appState: any;
    files: Record<string, any>;
  }) => void;
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

  useExcalidrawPatches();
  // 等动画结束/布局稳定后 refresh
  const handleAPI = createHandleAPI(containerRef, apiRef, initOnce);
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

  /** 唯一入口：把 Excalidraw 的 onChange 转发给外部（已做防抖） */
  const handleChange = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: any,
    files: any
  ) => {
    // @ts-ignore
    emitSceneChange(elements, appState, files);
  };

  // 把 API 暴露给外部（Vue）
  const handleAPIWithExpose = (api: ExcalidrawImperativeAPI) => {
    handleAPI(api);
    props.onApiReady?.(api);
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
        excalidrawAPI={handleAPIWithExpose}
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
