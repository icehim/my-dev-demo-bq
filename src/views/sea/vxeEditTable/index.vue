<script lang="tsx" setup>
import { reactive } from 'vue';
import { VxeGridProps } from 'vxe-table';
import { Plus } from '@element-plus/icons-vue';
const tableConfig = reactive<VxeGridProps>({
  border: true,
  editConfig: { trigger: 'click', mode: 'cell' },
  rowConfig: { keyField: 'id' },
  keepSource: true,
  toolbarConfig: {
    refresh: {
      queryMethod: () => getTableData()
    }
  },
  columns: [
    {
      type: 'checkbox',
      width: 40
    },
    {
      field: 'name',
      title: '卡车',
      editRender: { name: 'input' }
    },
    {
      field: 'jgqc',
      slots: {
        header: () => (
          <>
            <div class="text-center">
              <p>加固器材</p>
              <el-button type="primary" size="small" icon={Plus} circle />
            </div>
          </>
        )
      },
      children: []
    },
    {
      field: 'remark',
      title: '备注',
      editRender: { name: 'input' }
    }
  ],
  data: []
});

const getTableData = () => {
  // 接口原始数据
  const data = [
    {
      name: '卡车1',
      jgqcList: [
        {
          zw: '麻绳',
          value: '10',
          px: '1'
        }
      ],
      remkar: '备注1'
    }
  ];
  tableConfig.data = data;
};
getTableData();
</script>

<template>
  <vxe-grid ref="tableRef" v-bind="tableConfig" />
</template>

<style scoped lang="scss"></style>
