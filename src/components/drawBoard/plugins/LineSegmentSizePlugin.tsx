import type { IPluginProps } from '../utils/types';
import { ElRow, ElCol, ElSlider } from 'element-plus';
const LineSegmentPlugin = ({ drawingBoard }: IPluginProps) => {
  const graphics = drawingBoard.getSelectedGraphics();

  return (
    <ElRow>
      <ElCol span={24}>
        <p class="text">线段粗细</p>
      </ElCol>

      <ElCol span={24}>
        <ElSlider
          modelValue={graphics.value['strokeWidth']}
          onUpdate:modelValue={val => {
            graphics.value['strokeWidth'] = val;
          }}
          max={20}
          min={1}
        />
      </ElCol>
    </ElRow>
  );
};

export default LineSegmentPlugin;
