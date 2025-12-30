<template>
  <div id="app">
    <div class="qualityManual-container">
      <div>
        <!-- 写一个触发打开 onlyOffice 的事件 -->
        <button style="width: 160px" type="button" @click="getFile">
          测试预览onlyOffice文档
        </button>
        <button style="width: 120px" type="button" @click="close">关闭</button>
      </div>

      <div v-if="show" class="qualityManual-container-office">
        <!-- 用标签的形式使用组件 -->
        <vab-only-office :option="option" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import vabOnlyOffice from './onlyOffice.vue'; // 导入刚刚写好的组件

const show = ref(false);

// option 用 reactive，保证内部字段改动可响应
const option = reactive({
  url: 'http://localhost/welcome/',
  isEdit: false,
  fileType: '',
  title: '',
  lang: '',
  isPrint: false,
  user: { id: null, name: '' }
});

// 事件里面放打开文件需要的配置，例如文件路径，支持的格式等...
function getFile() {
  show.value = true;

  option.isEdit = false;
  option.lang = 'zh-CN';
  option.url = '你的文件路径';
  option.title = '这是个文档标题而已';
  option.fileType = 'pptx';
  option.isPrint = false;
  option.user = { id: 12, name: '张三' };
}

function close() {
  show.value = false;
}
</script>

<style>
html,
body {
  height: 100%;
}

#app {
  height: 100%;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.qualityManual-container {
  height: 100%;
  padding: 0 !important;
}

.qualityManual-container-office {
  width: 100%;
  height: calc(100% - 55px);
}
</style>
