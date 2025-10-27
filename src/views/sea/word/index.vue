<script setup lang="ts">
import Editor, { RowFlex } from '@hufe921/canvas-editor';
import { onMounted } from 'vue';

onMounted(() => {
  new Editor(
    document.querySelector('.canvas-editor'),
    {
      header: [
        {
          value: 'Header',
          rowFlex: RowFlex.CENTER
        }
      ],
      main: [
        {
          value: 'Hello World'
        }
      ],
      footer: [
        {
          value: 'canvas-editor',
          size: 12
        }
      ]
    },
    {}
  );
});
</script>

<template><div class="canvas-editor" /></template>

<style scoped lang="scss"></style>
