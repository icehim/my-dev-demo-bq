import './Menu.scss';

import { defineComponent } from 'vue';
import { ElTooltip, ElButton } from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  DeleteFilled,
  Download
} from '@element-plus/icons-vue';

import App from '../utils/App';

export default defineComponent({
  name: 'appMenu',
  setup() {
    return () => (
      <section class="appMenu">
        <ElTooltip effect="dark" content="撤销" placement="top-start">
          <ElButton
            onClick={() => App.drawingBoardInstance.historyBack()}
            icon={ArrowLeft}
            circle
          ></ElButton>
        </ElTooltip>

        <ElTooltip effect="dark" content="取消撤销" placement="top-start">
          <ElButton
            onClick={() => App.drawingBoardInstance.historyUnBack()}
            icon={ArrowRight}
            circle
          ></ElButton>
        </ElTooltip>

        <ElTooltip effect="dark" content="清空白板" placement="top-start">
          <ElButton
            onClick={() =>
              App.drawingBoardInstance.leaferInstanceReadonly.tree.clear()
            }
            icon={DeleteFilled}
            circle
          ></ElButton>
        </ElTooltip>

        <ElTooltip effect="dark" content="导出为图片" placement="top-start">
          <ElButton
            onClick={() =>
              App.drawingBoardInstance.leaferInstanceReadonly.export('画板.png')
            }
            icon={Download}
            circle
          ></ElButton>
        </ElTooltip>
      </section>
    );
  }
});
