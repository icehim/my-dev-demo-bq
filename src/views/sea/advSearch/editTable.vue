<script setup lang="tsx">
import { useRenderIcon } from '@/components/ReIcon/src/hooks';
import AddFill from '~icons/ep/plus';
import Delete from '~icons/ep/delete';
import { reactive, ref } from 'vue';
import type { FormInstance } from 'element-plus';

type Row = {
  id: number;
  name: string;
  sex: 0 | 1;
  hobby: number | '';
  date: string;
};

const options = [
  { value: 0, label: '上午写代码' },
  { value: 1, label: '下午写代码' },
  { value: 2, label: '晚上写代码' },
  { value: 3, label: '凌晨休息了' }
];

const formRef = ref<FormInstance>();

// ✅ 让表单 model 变得“名正言顺”
const formModel = reactive<{ list: Row[] }>({
  list: []
});

const columns: TableColumnList = [
  {
    label: '姓名',
    prop: 'name',
    cellRenderer: ({ row, index }) => (
      <el-form-item
        style="margin:0"
        prop={`list.${index}.name`}
        rules={[
          { required: true, message: '请输入姓名', trigger: 'blur' },
          { min: 2, message: '姓名至少 2 个字', trigger: 'blur' }
        ]}
      >
        <el-input
          v-model={row.name}
          onBlur={() => formRef.value?.validateField(`list.${index}.name`)}
        />
      </el-form-item>
    )
  },
  {
    label: '性别',
    prop: 'sex',
    cellRenderer: ({ row }) => (
      <el-switch
        v-model={row.sex}
        inline-prompt
        active-value={0}
        inactive-value={1}
        active-text="男"
        inactive-text="女"
      />
    )
  },
  {
    label: '爱好',
    prop: 'hobby',
    cellRenderer: ({ row, index }) => (
      <el-form-item
        style="margin:0"
        prop={`list.${index}.hobby`}
        rules={[{ required: true, message: '请选择爱好', trigger: 'change' }]}
      >
        <el-select
          v-model={row.hobby}
          clearable
          placeholder="请选择爱好"
          onChange={() => formRef.value?.validateField(`list.${index}.hobby`)}
        >
          {options.map(item => (
            <el-option key={item.value} label={item.label} value={item.value} />
          ))}
        </el-select>
      </el-form-item>
    )
  },
  {
    label: '日期',
    prop: 'date',
    minWidth: 110,
    cellRenderer: ({ row, index }) => (
      <el-form-item
        style="margin:0"
        prop={`list.${index}.date`}
        rules={[{ required: true, message: '请选择日期', trigger: 'change' }]}
      >
        <el-date-picker
          v-model={row.date}
          type="date"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="请选择日期"
          onChange={() => formRef.value?.validateField(`list.${index}.date`)}
        />
      </el-form-item>
    )
  },
  {
    label: '操作',
    fixed: 'right',
    width: 90,
    slot: 'operation'
  }
];

function onAdd() {
  formModel.list.push({
    id: formModel.list.length + 1,
    name: '',
    sex: 0,
    hobby: '',
    date: ''
  });
}
const data = [
  {
    bdmc: '单位1',
    cbList: [
      { cblx: '滚装船', num: 10 },
      { cblx: '油船', num: 10 }
    ]
  },
  {
    bdmc: '单位2',
    cbList: [
      { cblx: '滚装船', num: 100 },
      { cblx: '油船', num: 100 }
    ]
  }
];

function onDel(row: Row) {
  const index = formModel.list.indexOf(row);
  if (index !== -1) formModel.list.splice(index, 1);
}

// 可选：提交时校验整张表
async function onSubmit() {
  await formRef.value?.validate(); // ❌有错会自动标红并抛出校验失败
}
</script>

<template>
  <!-- ✅ 用 el-form 包住表格 -->
  <el-form ref="formRef" :model="formModel" status-icon>
    <pure-table
      row-key="id"
      align-whole="center"
      :header-cell-style="{
        background: 'var(--el-fill-color-light)',
        color: 'var(--el-text-color-primary)'
      }"
      :data="formModel.list"
      :columns="columns"
    >
      <template #append>
        <el-button
          plain
          class="w-full my-2!"
          :icon="useRenderIcon(AddFill)"
          @click="onAdd"
        >
          添加一行数据
        </el-button>
      </template>

      <template #operation="{ row }">
        <el-button
          class="reset-margin"
          link
          type="primary"
          :icon="useRenderIcon(Delete)"
          @click="onDel(row)"
        />
      </template>
    </pure-table>

    <!-- 可选：保存按钮 -->
    <!-- <el-button type="primary" @click="onSubmit">保存</el-button> -->
  </el-form>
</template>

<style scoped>
:deep(.el-table__inner-wrapper::before) {
  height: 0;
}
</style>
