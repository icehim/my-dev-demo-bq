<template>
  <DocumentEditor
    id="docEditor"
    ref="ooRef"
    documentServerUrl="http://localhost/"
    :config="config"
    :events_onDocumentReady="onDocumentReady"
    :events_onRequestSave="onRequestSave"
    :events_onError="onError"
    :onLoadComponentError="onLoadComponentError"
  />

  <div class="actions">
    <button @click="save">保存</button>
    <button @click="setView">只读</button>
    <button @click="setEdit">编辑</button>
    <button @click="reload">重载</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, shallowRef } from 'vue';
import { DocumentEditor } from '@onlyoffice/document-editor-vue';

// 组件 ref（Vue 组件实例）
const ooRef = ref<any>(null);

// OnlyOffice 的 DocEditor 实例（真正“可调 API”的对象）
const docEditor = shallowRef<any>(null);

// 配置建议用 reactive，改起来方便
const config = reactive({
  document: {
    fileType: 'docx',
    key: '8hqjaLFQoeyHTdhY6MRY0GVy1bFRN041',
    title: '测试.docx',
    url: 'http://26.26.26.1:8849/demo.docx'
  },
  documentType: 'word',
  editorConfig: {
    mode: 'edit',
    lang: 'zh'
    // callbackUrl: "http://xxx/callback"  // 要保存再配
  }
});

// 从组件实例里“捞”出 DocEditor（不同版本字段名不同）
function pickDocEditor(comp: any) {
  return (
    comp?.docEditor ||
    comp?.editor ||
    comp?.instance ||
    comp?.$?.exposed?.docEditor ||
    comp?.$?.exposed?.editor ||
    null
  );
}

// 事件：文档加载完成
function onDocumentReady() {
  console.log('Document is loaded');

  const comp = ooRef.value;
  const inst = pickDocEditor(comp);

  docEditor.value = inst;
  console.log('DocumentEditor component:', comp);
  console.log('OnlyOffice docEditor instance:', inst);

  if (!inst) {
    console.warn(
      '没拿到 docEditor 实例。请展开 console 里 DocumentEditor component，看实例挂在哪个字段上。'
    );
  }
}

// 调用：请求保存（会触发 onRequestSave；真正落盘需要 callbackUrl+后端）
function save() {
  if (!docEditor.value) return console.warn('docEditor not ready');
  docEditor.value.requestSave?.();
  // 有的版本叫 save / downloadAs 等，你可以 console.log(docEditor.value) 看方法列表
}

// 事件：用户点击保存等会触发
function onRequestSave() {
  console.log('onRequestSave fired');
}

// 事件：OnlyOffice 内部错误
function onError(e: any) {
  console.log('OnlyOffice onError:', e);
}

// 组件加载 api.js 失败等
function onLoadComponentError(code: number, desc: string) {
  console.log('Load component error:', code, desc);
}

// 切换模式通常需要销毁重建（很多版本不支持热切）
async function reload() {
  try {
    docEditor.value?.destroy?.();
  } catch {}

  docEditor.value = null;

  // 让 Vue 触发组件重渲染的一个简单做法：改 key
  // 你也可以把 DocumentEditor 外面包一层 v-if
  config.document.key = `${config.document.key}-${Date.now()}`;

  await nextTick();
}

function setView() {
  config.editorConfig.mode = 'view';
  reload();
}

function setEdit() {
  config.editorConfig.mode = 'edit';
  reload();
}
</script>

<style scoped>
.actions {
  position: fixed;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
}
</style>
