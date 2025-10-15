import { defineStore } from "pinia";

export const useMapStore = defineStore("map", {
  state: () => ({
    map: null
  }),
  actions: {
    setMap(mapInstance: any) {
      this.map = mapInstance;
    },
    getMap() {
      return this.map;
    }
  }
});
