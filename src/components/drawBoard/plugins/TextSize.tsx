import type { IPluginProps } from '../utils/types';
import { ElRow, ElCol, ElSlider } from 'element-plus';
const TextSize = ({ drawingBoard }: IPluginProps) => {
  const graphics = drawingBoard.getSelectedGraphics();

  return (
    <ElRow>
      <ElCol span={24}>
        <p class="text">文字大小</p>
      </ElCol>

      <ElCol span={24}>
        <ElSlider
          show-alpha
          modelValue={graphics.value['fontSize']}
          onUpdate:modelValue={val => {
            graphics.value['fontSize'] = val;
          }}
          max={100}
          min={12}
        />
      </ElCol>
    </ElRow>
  );
};

export default TextSize;
