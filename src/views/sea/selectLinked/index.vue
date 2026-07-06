<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeData = ref([
  {
    id: '1',
    name: '港口A',
    children: [
      {
        id: '1-1',
        name: '港区A1',
        children: [{ id: '1-1-1', name: '码头A1-1' }]
      }
    ]
  },
  {
    id: '2',
    name: '港口B',
    children: [
      {
        id: '2-1',
        name: '港区B1',
        children: [{ id: '2-1-1', name: '码头B1-1' }]
      },
      {
        id: '2-2',
        name: '港区C1',
        children: [{ id: '2-2-1', name: '码头C1-1' }]
      }
    ]
  }
]);

const form = reactive({
  portId: '',
  areaId: '',
  wharfId: ''
});

const portOptions = computed(() => treeData.value);

const currentPort = computed(() => {
  return treeData.value.find(item => item.id === form.portId);
});

const areaOptions = computed(() => {
  return currentPort.value?.children || [];
});

const currentArea = computed(() => {
  return areaOptions.value.find(item => item.id === form.areaId);
});

const wharfOptions = computed(() => {
  return currentArea.value?.children || [];
});

function onPortChange() {
  form.areaId = '';
  form.wharfId = '';
}

function onAreaChange() {
  form.wharfId = '';
}
</script>

<template>
  <el-select
    v-model="form.portId"
    filterable
    allow-create
    clearable
    placeholder="请选择或新增港口"
    @change="onPortChange"
  >
    <el-option
      v-for="item in portOptions"
      :key="item.id"
      :label="item.name"
      :value="item.id"
    />
  </el-select>

  <el-select
    v-model="form.areaId"
    filterable
    allow-create
    clearable
    placeholder="请选择或新增港区"
    @change="onAreaChange"
  >
    <el-option
      v-for="item in areaOptions"
      :key="item.id"
      :label="item.name"
      :value="item.id"
    />
  </el-select>

  <el-select
    v-model="form.wharfId"
    filterable
    allow-create
    clearable
    placeholder="请选择或新增码头"
  >
    <el-option
      v-for="item in wharfOptions"
      :key="item.id"
      :label="item.name"
      :value="item.id"
    />
  </el-select>
</template>
