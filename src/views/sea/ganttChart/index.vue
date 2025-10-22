<script setup lang="ts">
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { onMounted, ref } from 'vue';
import { gantt } from 'dhtmlx-gantt';
import dayjs from 'dayjs';
const contRef = ref(null);

const tasks = {
  data: [
    // 船只 #1：上海 → 广州
    {
      id: 1,
      text: '船只 #1',
      start_date: '2025-04-01',
      duration: 10,
      order: 1,
      progress: 0.5,
      open: true,
      echelon: '梯队 1',
      name: '船只 #1 - 上海到广州',
      start_port: '上海',
      end_port: '广州'
    },
    {
      id: 2,
      text: '起航 - 船只 #1',
      start_date: '2025-04-01',
      duration: 2,
      order: 2,
      progress: 1,
      parent: 1,
      echelon: '梯队 1',
      name: '船只 #1',
      start_port: '上海',
      end_port: '广州'
    },
    {
      id: 3,
      text: '航行 - 船只 #1',
      start_date: '2025-04-03',
      duration: 6,
      order: 3,
      progress: 0.3,
      parent: 1,
      echelon: '梯队 1',
      name: '船只 #1',
      start_port: '上海',
      end_port: '广州'
    },
    {
      id: 4,
      text: '到达 - 船只 #1',
      start_date: '2025-04-09',
      duration: 2,
      order: 4,
      progress: 0,
      parent: 1,
      echelon: '梯队 1',
      name: '船只 #1',
      start_port: '上海',
      end_port: '广州'
    },

    // 船只 #2：天津 → 深圳
    {
      id: 5,
      text: '船只 #2',
      start_date: '2025-04-01',
      duration: 12,
      order: 5,
      progress: 0.6,
      open: true,
      echelon: '梯队 2',
      name: '船只 #2 - 天津到深圳',
      start_port: '天津',
      end_port: '深圳'
    },
    {
      id: 6,
      text: '起航 - 船只 #2',
      start_date: '2025-04-01',
      duration: 3,
      order: 6,
      progress: 1,
      parent: 5,
      echelon: '梯队 2',
      name: '船只 #2',
      start_port: '天津',
      end_port: '深圳'
    },
    {
      id: 7,
      text: '航行 - 船只 #2',
      start_date: '2025-04-04',
      duration: 7,
      order: 7,
      progress: 0.5,
      parent: 5,
      echelon: '梯队 2',
      name: '船只 #2',
      start_port: '天津',
      end_port: '深圳'
    },
    {
      id: 8,
      text: '到达 - 船只 #2',
      start_date: '2025-04-11',
      duration: 2,
      order: 8,
      progress: 0,
      parent: 5,
      echelon: '梯队 2',
      name: '船只 #2',
      start_port: '天津',
      end_port: '深圳'
    }
  ]
};

onMounted(() => {
  // 解析 yyyy-mm-dd 格式
  gantt.config.date_format = '%Y-%m-%d';
  // 顶部时间轴显示 yyyy/mm/dd
  gantt.config.date_scale = '%Y-%m-%d';
  gantt.config.min_column_width = 90;
  //中文
  gantt.i18n.setLocale('cn');
  //只读模式
  gantt.config.readonly = true;
  // 开启marker插件
  // gantt.plugins({ marker: true, tooltip: true });
  // 自定义列头：只显示 序号 和 梯队
  gantt.config.columns = [
    {
      name: 'order',
      label: '序号',
      width: 80,
      align: 'center',
      template: task => task.order || ''
    },
    {
      name: 'echelon',
      label: '梯队',
      width: 80,
      align: 'center',
      template: task => task.echelon
    },
    {
      name: 'name',
      label: '船名',
      tree: true,
      width: 170,
      template: task => task.name
    }
  ];
  gantt.init(contRef.value);
  gantt.parse(tasks);
});
</script>

<template>
  <div>
    <div ref="contRef" class="h-full w-full" />
  </div>
</template>

<style scoped lang="scss"></style>
