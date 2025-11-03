import React, { useMemo, useRef } from 'react';

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
  /** 是否让 Excalidraw 接管全局键盘（默认 false） */
  handleKeyboardGlobally?: boolean;
  /** 是否拦截快捷键（默认 false） */
  blockShortcuts?: boolean;
  /** 是否拦截右键/菜单（默认 false） */
  blockContextMenu?: boolean;
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
  // 是否拦截快捷键/右键（默认都开启,不拦截）
  useBlockShortcutsAndContext(containerRef, {
    blockKeyboard: props.blockShortcuts ?? false,
    blockContextMenu: props.blockContextMenu ?? false,
    blockRightClick: props.blockContextMenu ?? false
  });
  // 等动画结束/布局稳定后 refresh
  const handleAPI = createHandleAPI(containerRef, apiRef, initOnce);
  const className =
    props.blockShortcuts && props.blockContextMenu ? 'excalidraw-readonly' : '';
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
