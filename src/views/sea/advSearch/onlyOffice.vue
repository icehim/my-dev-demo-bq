<template>
  <div id="vabOnlyOffice" />
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  option: {
    type: Object,
    default: () => ({})
  }
});

const doctype = ref('');
const docEditor = ref(null);

function destroyEditor() {
  if (docEditor.value) {
    docEditor.value.destroyEditor();
    docEditor.value = null;
  }
}

function getFileType(fileType) {
  let docType = '';

  const fileTypesDoc = [
    'doc',
    'docm',
    'docx',
    'dot',
    'dotm',
    'dotx',
    'epub',
    'fodt',
    'htm',
    'html',
    'mht',
    'odt',
    'ott',
    'pdf',
    'rtf',
    'txt',
    'djvu',
    'xps'
  ];
  const fileTypesCsv = [
    'csv',
    'fods',
    'ods',
    'ots',
    'xls',
    'xlsm',
    'xlsx',
    'xlt',
    'xltm',
    'xltx'
  ];
  const fileTypesPPt = [
    'fodp',
    'odp',
    'otp',
    'pot',
    'potm',
    'potx',
    'pps',
    'ppsm',
    'ppsx',
    'ppt',
    'pptm',
    'pptx'
  ];

  if (fileTypesDoc.includes(fileType)) docType = 'text';
  if (fileTypesCsv.includes(fileType)) docType = 'spreadsheet';
  if (fileTypesPPt.includes(fileType)) docType = 'presentation';

  return docType;
}

async function setEditor(option = {}) {
  // 先销毁旧实例
  destroyEditor();

  doctype.value = getFileType(option.fileType);

  const userId = option?.user?.id ?? null;
  const userName = option?.user?.name ?? '';

  const config = {
    document: {
      fileType: option.fileType,
      key: option.key || '',
      title: option.title,
      permissions: {
        edit: option.isEdit, // 是否可编辑
        print: option.isPrint,
        download: false
      },
      url: option.url
    },
    documentType: doctype.value,
    editorConfig: {
      callbackUrl: option.editUrl, // 保存回调
      lang: option.lang,
      customization: {
        autosave: false,
        chat: false,
        comments: false,
        help: false,
        plugins: false
      },
      user: {
        id: userId,
        name: userName
      },
      // 你原代码是 option.model，通常应是 option.mode，这里做兼容兜底
      mode: option.mode ?? option.model ?? 'edit'
    },
    width: '100%',
    height: '100%',
    token: option.token || ''
  };

  // DocsAPI 是外部注入的全局对象

  docEditor.value = new DocsAPI.DocEditor('vabOnlyOffice', config);
}

watch(
  () => props.option,
  n => {
    setEditor(n);
    doctype.value = getFileType(n?.fileType);
  },
  { deep: true }
);

onMounted(() => {
  if (props.option?.url) {
    setEditor(props.option);
  }
});

onBeforeUnmount(() => {
  destroyEditor();
});
</script>
