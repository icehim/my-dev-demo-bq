export default {
  path: "/Konva",
  redirect: "/Konva/index",
  meta: {
    icon: "ep/location",
    title: "Konva"
  },
  children: [
    {
      path: "/Konva/index",
      name: "Konva",
      component: () => import("@/views/Konva/index.vue"),
      meta: {
        title: "Konva"
      }
    }
  ]
} satisfies RouteConfigsTable;
