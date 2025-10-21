export default {
  path: '/openlyaers',
  redirect: '/openlyaers/Stated',
  meta: {
    icon: 'ri/information-line',
    title: 'openlyaers'
  },
  children: [
    {
      path: '/openlyaers/Stated',
      name: 'Stated',
      component: () => import('@/views/openlayers/Stated.vue'),
      meta: {
        title: '开始'
      }
    },

    {
      path: '/openlyaers/Zoom',
      name: 'Zoom',
      component: () => import('@/views/openlayers/Zoom.vue'),
      meta: {
        title: '缩放Zoom'
      }
    },
    {
      path: '/openlyaers/Popup',
      name: 'Popup',
      component: () => import('@/views/openlayers/Popup.vue'),
      meta: {
        title: '弹窗Popup'
      }
    }
  ]
} satisfies RouteConfigsTable;
