<script setup lang="ts">
import { getList } from './api';
import error from './error.png';
import loading from './loading.png';
import { ElLoading } from 'element-plus';
import 'vue-waterfall-plugin-next/dist/style.css';
import InfiniteLoading from 'v3-infinite-loading';
import { onMounted, reactive, ref, nextTick } from 'vue';
import backTop from '@/assets/svg/back_top.svg?component';
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
const list = ref([]);
const pageSize = ref();
const loadingInstance = ref();
const testNumber = ref(1);
/** 加载更多 */
function handleLoadMore() {
  loadingInstance.value = ElLoading.service({
    target: '.content',
    background: 'transparent',
    text: '加载中'
  });
  getList({
    page: page.value,
    pageSize: pageSize.value
  }).then(res => {
    setTimeout(() => {
      list.value.push(...res);
      page.value += 1;
      nextTick(() => {
        loadingInstance.value.close();
      });
    }, 500);
  });
}

function handleDelete(item, index) {
  list.value.splice(index, 1);
}

function handleClick(item) {
  console.log(item);
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
    <el-scrollbar max-height="calc(100vh - 120px)" class="content">
      <Waterfall :list="list" v-bind="options">
        <template #item="{ item, url, index }">
          <div
            class="bg-gray-900 rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-linear hover:shadow-lg hover:shadow-gray-600 group"
            @click="handleClick(item)"
          >
            <div class="overflow-hidden">
              <LazyImg
                :url="url"
                class="cursor-pointer transition-all duration-300 ease-linear group-hover:scale-105"
              />
            </div>
            <div class="px-4 pt-2 pb-4 border-t border-t-gray-800">
              <h4 class="pb-4! text-gray-50 group-hover:text-yellow-300">
                {{ item.name }}
              </h4>
              <div
                class="pt-3 flex justify-between items-center border-t border-t-gray-600 border-opacity-50"
              >
                <div class="text-gray-50">$ {{ item.price }}</div>
                <div>
                  <button
                    class="px-3! rounded-full bg-red-500 text-sm text-white shadow-lg transition-all duration-300 hover:bg-red-600 border-0"
                    @click.stop="handleDelete(item, index)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Waterfall>
      <!-- 加载更多 -->
      <InfiniteLoading :identifier="testNumber" @infinite="handleLoadMore" />
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  margin: 0 !important;
}

:deep(.el-loading-spinner .el-loading-text) {
  font-size: 24px;
}
</style>
