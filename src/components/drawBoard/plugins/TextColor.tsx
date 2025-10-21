import type { IPluginProps } from '../utils/types';
import { ElRow, ElCol, ElColorPicker } from 'element-plus';
const TextColor = ({ drawingBoard }: IPluginProps) => {
  const graphics = drawingBoard.getSelectedGraphics();

  return (
    <ElRow>
      <ElCol span={24}>
        <p class="text">文字颜色</p>
      </ElCol>

      <ElCol span={24}>
        <ElColorPicker
          show-alpha
          modelValue={graphics.value['fill']}
          onUpdate:modelValue={val => {
            graphics.value['fill'] = val;
          }}
        />
      </ElCol>
    </ElRow>
  );
};

export default TextColor;
