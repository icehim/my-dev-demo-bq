<script lang="ts" setup>
import AdvancedFilter from '@/components/AdvancedFilter/index.vue';
import { reactive } from 'vue';
import { PureTableBar } from '@/components/RePureTableBar';
import PureTable from '@pureadmin/table';
const query = reactive({
  keyword: '',
  name: '',
  gender: ''
});

const columns: TableColumnList = [
  {
    label: '序号',
    type: 'index',
    width: 60
  },
  {
    label: '姓名',
    prop: 'name'
  },
  {
    label: '性别',
    prop: 'sex'
  }
];
const dataList = [
  { name: '张三', sex: '男' },
  { name: '李四', sex: '女' }
];
const formInline = reactive({
  user: '',
  region: '',
  date: ''
});

const onSubmit = () => {
  console.log('submit!');
};

// 高级筛选模型
const advQuery = reactive({
  name: '',
  gender: ''
});

// 告诉组件如何把字段变成 tag 文案
const advFields = [
  { key: 'name', label: '姓名' },
  {
    key: 'gender',
    label: '性别',
    formatter: v => (v === 'male' ? '男' : v === 'female' ? '女' : '')
  }
];
const onSearch = () => {
  const params = {
    ...query,
    ...advQuery
  };
  console.log('搜索参数：', params);
  // 调接口...
};
const onAdvConfirm = (payload: Record<string, any>) => {
  // 把子组件里编辑好的值同步回父级真实表单
  Object.assign(advQuery, payload);
  onSearch();
};

const onAdvReset = (payload: Record<string, any>) => {
  Object.assign(advQuery, payload);
  onSearch(); // 看你需不需要重置后立刻请求
};
</script>

<template>
  <div>
    <pure-table-bar :columns="columns">
      <template #title>
        <el-form :inline="true" :model="formInline" class="demo-form-inline">
          <el-form-item label="姓名">
            <el-input
              v-model="formInline.user"
              placeholder="请输入姓名"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <AdvancedFilter
              :model="advQuery"
              :fields="advFields"
              @confirm="onAdvConfirm"
              @reset="onAdvReset"
            >
              <!-- 这里用 slot 拿到 form（其实就是 innerForm） -->
              <template #default="{ form }">
                <el-form-item label="姓名">
                  <el-input v-model="form.name" placeholder="姓名" />
                </el-form-item>

                <el-form-item label="性别">
                  <el-select
                    v-model="form.gender"
                    placeholder="请选择"
                    clearable
                    :teleported="false"
                  >
                    <el-option label="男" value="male" />
                    <el-option label="女" value="female" />
                  </el-select>
                </el-form-item>
              </template>
            </AdvancedFilter>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onSubmit">搜索</el-button>
            <el-button type="primary" plain @click="onSubmit">重置</el-button>
          </el-form-item>
        </el-form>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table :size="size" :columns="dynamicColumns" :data="dataList" />
      </template>
    </pure-table-bar>
  </div>
</template>

<style scoped lang="scss"></style>
