<script lang="ts" setup>
import { applyReactInVue } from 'veaury';
import BaseReactComponent from './react_app/Basic';
import { onMounted, ref } from 'vue';
const BasePure = applyReactInVue(BaseReactComponent);
const foo = ref('hello');
const handleTest = () => {
  foo.value += 'hello';
  basePureRef.value.sayHello();
};
const handClick = () => {
  foo.value += 'hello';
};
const basePureRef = ref(null);
</script>

<template>
  <div>
    <el-button type="primary" @click="handleTest">测试</el-button>
    <base-pure ref="basePureRef" :foo="foo" @click="handClick">
      <div>children内容</div>
    </base-pure>
  </div>
</template>

<style scoped lang="scss"></style>
