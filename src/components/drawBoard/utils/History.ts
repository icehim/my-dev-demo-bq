import type { App, IUIJSONData } from 'leafer-ui';
import { type Ref, ref } from 'vue';

export const clearAppJson = (_: IUIJSONData) => {
  _.children = _.children?.filter(({ tag }) => tag !== 'SimulateElement');

  return _;
};

class History {
  queue: Ref<IUIJSONData[]> = ref([]);
  activeIndex = this.queue.value.length;

  // // 撤销 || 取消撤销
  // operate: IOperate = ''
  // preOperate: IOperate = ''

  constructor(app: App) {
    this.save(app.tree.toJSON());
  }

  save(json: IUIJSONData) {
    if (!json) return false;

    json = clearAppJson(json);

    const newJson = JSON.stringify(json);
    const oldJson = JSON.stringify(
      this.queue.value[this.activeIndex - 1] || ''
    );

    // 可优化，简单对比
    if (newJson === oldJson) return false;

    if (this.queue.value.length >= 20) {
      this.queue.value.shift();
    }

    this.queue.value.push(json);
    this.activeIndex = this.queue.value.length;

    return true;
  }

  getBackJson() {
    // 上一次
    const _json = this.queue.value[this.activeIndex - 2];

    if (this.activeIndex < -1 || !_json) {
      console.warn('已无更多可撤销数据');
      return null;
    }

    this.activeIndex--;

    return _json;
  }

  getUnBackJson() {
    if (
      this.activeIndex >= this.queue.value.length ||
      !this.queue.value[this.activeIndex]
    ) {
      console.warn('已无更多可恢复数据');
      return null;
    }

    const _json = this.queue.value[this.activeIndex];
    this.activeIndex++;

    return _json;
  }
}

export default History;
