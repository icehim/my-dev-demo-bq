export default {
  path: '/mars2d',
  redirect: '/mars2d/index',
  meta: {
    icon: 'ep/location',
    title: 'mars2d'
  },
  children: [
    {
      path: '/mars2d/index',
      name: 'Mars2d',
      component: () => import('@/views/mars2d/index.vue'),
      meta: {
        title: 'mars2d'
      }
    }
  ]
} satisfies RouteConfigsTable;
