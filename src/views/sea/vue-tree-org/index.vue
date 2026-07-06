<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { ElSwitch, ElColorPicker, ElMessage } from 'element-plus';

// 开关状态
const horizontal = ref(true);
const collapsable = ref(true);
const disabled = ref(false); // 修复原拼写错误 disaled
const onlyOneNode = ref(false);
const cloneNodeDrag = ref(true);
const expandAll = ref(true);

// 全局节点样式
const style = reactive({
  background: '#fff',
  color: '#5e6d82'
});

// 树形数据源
const treeData = reactive({
  id: 1,
  label: 'xxx科技有限公司',
  children: [
    {
      id: 2,
      pid: 1,
      label: '产品研发部',
      style: { color: '#fff', background: '#108ffe' },
      children: [
        { id: 6, pid: 2, label: '禁止编辑节点', disabled: true },
        { id: 8, pid: 2, label: '禁止拖拽节点', noDragging: true },
        { id: 10, pid: 2, label: '测试' }
      ]
    },
    {
      id: 3,
      pid: 1,
      label: '客服部',
      children: [
        { id: 11, pid: 3, label: '客服一部' },
        { id: 12, pid: 3, label: '客服二部' }
      ]
    },
    { id: 4, pid: 1, label: '业务部' }
  ]
});

// 右键菜单
const onMenus = ({ node, command }) => {
  console.log('右键菜单');
  console.log(node, command);
  setTimeout(() => {
    moveContextMenuToFullscreen();
  }, 0);
};

// 节点展开/折叠
const onExpand = (e, data) => {
  console.log(e, data);
};

const onExpandAll = b => {
  console.log(b);
};

// 拖拽中
const nodeDragMove = data => {
  console.log(data);
};

// 拖拽结束前校验（异步Promise）
const beforeDragEnd = async (node, targetNode) => {
  if (!targetNode) throw new Error('无目标节点');
  if (node.id === targetNode.id) throw new Error('不能拖到自身');
  return true;
};

// 拖拽完成
const nodeDragEnd = (data, isSelf) => {
  console.log(data, isSelf);
};

// 双击节点
const onNodeDblclick = () => {
  console.log('onNodeDblclick');
};

// 单击节点
const onNodeClick = (e, data) => {
  ElMessage.info(data.label);
};

// 递归展开/折叠所有节点
const toggleExpand = (data, val) => {
  if (Array.isArray(data)) {
    data.forEach(item => {
      item.expand = val;
      if (item.children) toggleExpand(item.children, val);
    });
  } else {
    data.expand = val;
    if (data.children) toggleExpand(data.children, val);
  }
};

const expandChange = () => {
  toggleExpand(treeData, expandAll.value);
};

let contextMenuObserver = null;

const moveContextMenuToFullscreen = () => {
  const fullscreenEl = document.fullscreenElement;
  const menuEl = document.querySelector('.zm-tree-contextmenu');

  if (fullscreenEl && menuEl && !fullscreenEl.contains(menuEl)) {
    fullscreenEl.appendChild(menuEl);
  }
};

const watchContextMenu = () => {
  contextMenuObserver?.disconnect();

  contextMenuObserver = new MutationObserver(() => {
    moveContextMenuToFullscreen();
  });

  contextMenuObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};

const handleFullscreenChange = () => {
  if (document.fullscreenElement) {
    watchContextMenu();
  } else {
    contextMenuObserver?.disconnect();
    contextMenuObserver = null;
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  // 移除全屏事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);

  // 停止 MutationObserver
  contextMenuObserver?.disconnect();
  contextMenuObserver = null;
});
</script>
<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 10px; padding: 10px">
      <div><el-switch v-model="horizontal" /> 横向</div>
      <div><el-switch v-model="collapsable" /> 可收起</div>
      <div><el-switch v-model="disabled" /> 禁止编辑</div>
      <div><el-switch v-model="onlyOneNode" /> 仅拖动当前节点</div>
      <div><el-switch v-model="cloneNodeDrag" /> 拖动节点副本</div>
    </div>
    <div style="padding: 0 10px 10px">
      背景色：<el-color-picker v-model="style.background" size="small" />
      文字颜色：<el-color-picker v-model="style.color" size="small" />
    </div>
    <div style="height: 400px">
      <vue3-tree-org
        :data="treeData"
        center
        :horizontal="horizontal"
        :collapsable="collapsable"
        :label-style="style"
        :only-one-node="onlyOneNode"
        :clone-node-drag="cloneNodeDrag"
        :before-drag-end="beforeDragEnd"
        @on-node-drag="nodeDragMove"
        @on-node-drag-end="nodeDragEnd"
        @on-contextmenu="onMenus"
        @on-expand="onExpand"
        @on-node-dblclick="onNodeDblclick"
        @on-node-click="onNodeClick"
      />
    </div>
  </div>
</template>
<style></style>
