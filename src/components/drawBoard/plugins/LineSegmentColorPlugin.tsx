import { ElRow, ElCol, ElColorPicker } from 'element-plus';
import type { IPluginProps } from '../utils/types';
const LineSegmentColorPlugin = ({ drawingBoard }: IPluginProps) => {
  const graphics = drawingBoard.getSelectedGraphics();

  return (
    <ElRow>
      <ElCol span={24}>
        <p class="text">线段颜色</p>
      </ElCol>

      <ElCol span={24}>
        <ElColorPicker
          show-alpha
          modelValue={graphics.value['stroke']}
          onUpdate:modelValue={val => {
            graphics.value['stroke'] = val;
          }}
        />
      </ElCol>
    </ElRow>
  );
};

export default LineSegmentColorPlugin;
