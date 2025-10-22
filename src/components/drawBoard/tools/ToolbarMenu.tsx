import './ToolbarMenu.scss';

import { computed, defineComponent } from 'vue';
import App from '../utils/App';
import { toolBarOptions } from '../utils/Tools';
import LayerOptions from '../plugins/LayerOptions';

export default defineComponent({
  name: 'ToolbarMenu',
  setup() {
    const activeGraphics = computed(() => {
      if (App.drawingBoardInstance.tools.toolbarActiveIndex.value) {
        return toolBarOptions[
          App.drawingBoardInstance.tools.toolbarActiveIndex.value
        ];
      } else if (App.drawingBoardInstance.selectedGraphics.value) {
        return toolBarOptions.find(v => {
          return (
            v.name === App.drawingBoardInstance.selectedGraphics.value.name
          );
        });
      }
    });

    return () => (
      <div>
        {activeGraphics.value?.menuPlugins?.length ? (
          <section className="toolbarMenu">
            {activeGraphics.value?.menuPlugins?.map(MenuPlugin => {
              return (
                <div className="toolbarMenuOption">
                  <MenuPlugin drawingBoard={App.drawingBoardInstance} />
                </div>
              );
            })}

            <LayerOptions drawingBoard={App.drawingBoardInstance} />
          </section>
        ) : null}
      </div>
    );
  }
});
