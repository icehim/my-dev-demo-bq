<script setup lang="ts">
import { getList } from './api';
import error from './error.png';
import loading from './loading.png';
import { ElLoading } from 'element-plus';
import 'vue-waterfall-plugin-next/dist/style.css';
import InfiniteLoading from 'v3-infinite-loading';
import { reactive, ref } from 'vue';
import { LazyImg, Waterfall } from 'vue-waterfall-plugin-next';

const options = reactive({
  rowKey: 'id',
  gutter: 10,
  hasAroundGutter: true,
  width: 320,
  breakpoints: {
    1200: { rowPerView: 4 },
    800: { rowPerView: 3 },
    500: { rowPerView: 2 }
  },
  animationEffect: 'animate__zoomInUp',
  animationDuration: 1000,
  animationDelay: 300,
  imgSelector: 'src.original',
  loadProps: { loading, error },
  lazyload: true
});

const page = ref(1);
const list = ref<any[]>([]);
const pageSize = ref(20);
const loadingInstance = ref<any>(null);
const testNumber = ref(1);

function handleLoadMore($state: any) {
  loadingInstance.value = ElLoading.service({
    target: '.content',
    background: 'transparent',
    text: '加载中'
  });

  getList({
    page: page.value,
    pageSize: pageSize.value
  })
    .then((res: any[]) => {
      const rows = Array.isArray(res) ? res : [];

      if (rows.length === 0) {
        $state.complete();
        return;
      }

      list.value.push(...rows);
      page.value += 1;

      if (rows.length < pageSize.value) {
        $state.complete();
      }
    })
    .catch(() => {
      $state.error();
    })
    .finally(() => {
      loadingInstance.value?.close?.();
    });
}

const test = () => {
  page.value = 1;
  list.value = [];
  testNumber.value += 1;
};
</script>

<template>
  <div>
    <el-button type="primary" @click="test">测试</el-button>

    <el-scrollbar max-height="calc(100vh - 220px)" class="content">
      <Waterfall :list="list" v-bind="options">
        <template #item="{ item, url, index }">
          <div @click="console.log(item)">
            <LazyImg :url="url" />
            <div>{{ item.name }}</div>
            <el-button type="danger" @click.stop="list.splice(index, 1)"
              >删除</el-button
            >
          </div>
        </template>
      </Waterfall>

      <InfiniteLoading :identifier="testNumber" @infinite="handleLoadMore" />
    </el-scrollbar>
  </div>
</template>
