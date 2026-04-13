<template>
  <TechCard
    title="名称XXXXXXX"
    desc="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    date="2025 - 04 - 06"
    :actions="[
      { text: '查看详情', type: 'blue', key: 'detail' },
      { text: '立即处理', type: 'green', key: 'handle' },
      { text: '删除', type: 'blue', key: 'delete' }
    ]"
    @actionClick="onActionClick"
  />
</template>

<script setup lang="ts">
import TechCard from '@/components/TechCard/index.vue';

const onActionClick = (action: any, index: number) => {
  console.log('点击了按钮:', action, index);
};
</script>
