export default {
  path: '/sea',
  meta: {
    icon: 'ep/location',
    title: '海上',
    rank: 99
  },
  children: [
    /*{
      path: '/sea/drawingBoard',
      name: 'drawingBoard',
      component: () => import('@/views/sea/drawingBoard/index.vue'),
      meta: {
        title: '绘板'
      }
    },*/
    {
      path: '/sea/ganttChart',
      name: 'ganttChart',
      component: () => import('@/views/sea/ganttChart/index.vue'),
      meta: {
        title: '甘特图'
      }
    },
    {
      path: '/sea/word',
      name: 'word',
      component: () => import('@/views/sea/word/index.vue'),
      meta: {
        title: 'Word'
      }
    },
    {
      path: '/sea/excalidraw',
      name: 'excalidraw',
      component: () => import('@/views/sea/excalidraw/index.vue'),
      meta: {
        title: 'excalidraw'
      }
    },
    {
      path: '/sea/veaury',
      name: 'veaury',
      component: () => import('@/views/sea/veaury/index.vue'),
      meta: {
        title: 'veaury'
      }
    },
    {
      path: '/sea/theme',
      name: 'theme',
      component: () => import('@/views/sea/theme/index.vue'),
      meta: {
        title: '主题色'
      }
    },
    {
      path: '/sea/advsearch',
      name: 'advSearch',
      component: () => import('@/views/sea/advSearch/vueOnlyOffice.vue'),
      meta: {
        title: '高级搜索'
      }
    },
    {
      path: '/sea/tableMerge',
      name: 'tableMerge',
      component: () => import('@/views/sea/tableMerge/index.vue'),
      meta: {
        title: '表格合并移动'
      }
    },
    {
      path: '/sea/mars2dship',
      name: 'mars2dship',
      component: () => import('@/views/sea/mars2d/index.vue'),
      meta: {
        title: '船舶时序播放'
      }
    }
  ]
} satisfies RouteConfigsTable;
