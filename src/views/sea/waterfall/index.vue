<script setup>
import { ref } from 'vue';
// import InfiniteLoading from '@/views/sea/waterfall/InfiniteLoading.vue';
import InfiniteLoading from 'v3-infinite-loading';

const comments = ref([]);
const testNumber = ref(1);
let page = 1;
const load = async $state => {
  console.log('loading...');
  try {
    const response = await fetch(
      'https://jsonplaceholder.typicode.com/comments?_limit=10&_page=' + page
    );
    const json = await response.json();
    if (json.length < 10) $state.complete();
    else {
      comments.value = json;
      $state.complete();
    }
    page++;
  } catch (error) {
    $state.error();
  }
};
const test = () => {
  testNumber.value = 10;
};
</script>
<template>
  <div class="w-full h-full">
    <div class="text-center mb-[20px]">
      <el-button type="primary" @click="test">测试</el-button>
      <input v-model="testNumber" type="number" />
    </div>
    <div>
      <div v-for="comment in comments" :key="comment.id" class="result">
        <div>{{ comment.email }}</div>
        <div>{{ comment.id }}</div>
      </div>
      <InfiniteLoading :identifier="testNumber" @infinite="load" />
    </div>
  </div>
</template>
<style>
.bottom-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 500px;
  max-width: 90vw;
  height: 500px;
  max-height: 600px;
  padding: 10px;
  margin: 0 auto;
  overflow-y: scroll;
  background: #333536;
  border-radius: 10px;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 400px;
  padding: 10px;
  margin: 0 auto 10px;
  font-weight: 300;
  text-align: center;
  background: #eceef0;
  border-radius: 10px;
}
</style>
