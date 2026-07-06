<script lang="tsx" setup>
import { reactive, ref } from 'vue';
import type { FormInstance } from 'element-plus';
import type { VxeGridProps } from 'vxe-table';
import { useRenderIcon } from '@/components/ReIcon/src/hooks';
import AddFill from '~icons/ep/plus';
interface RouteRow {
  id: number;
  gkmc: string;
}

const formRef = ref<FormInstance>();

const form = reactive({
  hxmc: '',
  routeData: [] as RouteRow[]
});

const portOptions = [
  { label: '上海港', value: '上海港' },
  { label: '宁波港', value: '宁波港' },
  { label: '广州港', value: '广州港' }
];

interface RouteRow {
  id: number;
  tjd: string;
  gkmc: string;
}

let rowId = 1;

const createRow = (): RouteRow => ({
  id: rowId++,
  tjd: '',
  gkmc: ''
});

const refreshTjd = () => {
  form.routeData.forEach((item, index) => {
    if (index === 0) {
      item.tjd = '起点';
    } else if (index === form.routeData.length - 1) {
      item.tjd = '终点';
    } else {
      item.tjd = `途径点${index}`;
    }
  });
};

const initRouteData = () => {
  if (form.routeData.length < 2) {
    form.routeData.splice(0, form.routeData.length, createRow(), createRow());
  }

  refreshTjd();
};

const addCol = () => {
  const insertIndex = form.routeData.length - 1;
  form.routeData.splice(insertIndex, 0, createRow());
  refreshTjd();
};

const delCol = (row: RouteRow) => {
  const index = form.routeData.findIndex(item => item.id === row.id);

  if (index <= 0 || index === form.routeData.length - 1) return;

  form.routeData.splice(index, 1);
  refreshTjd();
};

initRouteData();

const tableConfig = reactive<VxeGridProps<RouteRow>>({
  border: true,
  showOverflow: true,
  rowConfig: {
    keyField: 'id'
  },
  data: form.routeData,
  columns: [
    {
      field: 'tjd',
      slots: {
        header: () => (
          <>
            <div class="flex-c gap-[8px]">
              <span>途径点</span>
              <el-button
                size="small"
                type="primary"
                icon={useRenderIcon(AddFill)}
                onClick={addCol}
              />
            </div>
          </>
        )
      }
    },
    {
      field: 'gkmc',
      title: '港口名称/经纬度',
      slots: {
        default: ({ row, rowIndex }) => {
          const isFirstOrLast =
            rowIndex === 0 || rowIndex === form.routeData.length - 1;

          return (
            <el-form-item
              prop={['routeData', rowIndex, 'gkmc']}
              rules={[
                {
                  required: true,
                  trigger: isFirstOrLast ? 'change' : 'blur'
                }
              ]}
            >
              {isFirstOrLast ? (
                <el-select v-model={row.gkmc} placeholder="请选择" clearable>
                  {portOptions.map(item => (
                    <el-option
                      key={item.value}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </el-select>
              ) : (
                <el-input v-model={row.gkmc} placeholder="请输入" clearable />
              )}
            </el-form-item>
          );
        }
      }
    },
    {
      title: '操作',
      width: 100,
      slots: { default: 'action' }
    }
  ]
});

const submit = async () => {
  await formRef.value?.validate();
  console.log('校验通过', form);
};
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="100px">
    <el-form-item label="航线名称" prop="hxmc">
      <el-input v-model="form.hxmc" />
    </el-form-item>
    <el-form-item label="途径点">
      <vxe-grid v-bind="tableConfig" class="w-full">
        <template #action="{ row, rowIndex }">
          <el-button
            v-if="rowIndex > 0 && rowIndex < form.routeData.length - 1"
            type="danger"
            @click="delCol(row)"
          >
            删除
          </el-button>
        </template>
      </vxe-grid>
    </el-form-item>
    <el-button type="primary" @click="submit">提 交</el-button>
  </el-form>
</template>
