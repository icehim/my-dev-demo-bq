import React, { useEffect, useRef } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

// 设置初始样式配置（朴素直线+尖角）
const initialData = {
  appState: {
    currentItemRoughness: 0, // 线条粗糙度（0=无手绘，1=略手绘，2=很手绘）
    currentItemRoundness: null // 线条形状圆角程度（0=尖锐，1=圆润）
  }
};

/** 1) 文案替换表：把英文或已有中文 => 你想要的中文 */
const TEXT_MAP: Record<string, string> = {
  // 右键菜单/帮助弹窗里没汉化的
  'Toggle grid': '网格线',
  'Canvas & Shape properties': '详细统计信息',
  禅模式: '绘图模式'
};

/** 2) 工具函数：替换右键菜单里的文字（context menu） */
const replaceContextMenuTexts = () => {
  // 右键菜单项常见结构：.dropdown-menu-item__text
  const nodes = document.querySelectorAll<HTMLElement>(
    '.excalidraw .context-menu-item__label'
  );
  nodes.forEach(n => {
    const raw = n.textContent?.trim();
    if (!raw) return;
    const mapped = TEXT_MAP[raw];
    if (mapped && raw !== mapped) n.textContent = mapped;
  });
};

/** 3) 工具函数：替换帮助弹窗里的文字（Help Dialog） */
const replaceHelpDialogTexts = () => {
  const rows = document.querySelectorAll('.excalidraw .HelpDialog__shortcut');
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
};

export default function ExcalidrawPure() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const onReady = (api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  };

  useEffect(() => {
    /** 统一调度：每次 DOM 有变化时，都尝试做一遍修正 */
    const runAllPatches = () => {
      replaceContextMenuTexts();
      replaceHelpDialogTexts();
      // apiRef.current.refresh();
    };

    // 监听整个文档的变化（右键菜单/帮助弹窗/下拉菜单都是点击后才出现）
    const mo = new MutationObserver(runAllPatches);
    mo.observe(document.body, { childList: true, subtree: true });

    // 初始化先跑一次（以防已经渲染）
    runAllPatches();
    // 卸载时清理
    return () => mo.disconnect();
  }, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        langCode="zh-CN"
        initialData={initialData}
        excalidrawAPI={onReady}
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
