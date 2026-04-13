<script setup>
import { ref } from 'vue';
import InfiniteLoading from '@/views/sea/waterfall/InfiniteLoading.vue';

let comments = ref([]);
let testNumber = ref(1);
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
</script>
<template>
  <div>
    <input v-model="testNumber" type="number" />
  </div>
  <div v-for="comment in comments" :key="comment.id" class="result">
    <div>{{ comment.email }}</div>
    <div>{{ comment.id }}</div>
  </div>
  <InfiniteLoading :identifier="testNumber" @infinite="load" />
</template>
<style>
#app {
  margin-top: 60px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
