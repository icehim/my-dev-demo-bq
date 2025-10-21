import mapView from './src/index.vue';
import { withInstall } from '@pureadmin/utils';

/** 支持`Tooltip`提示的文本省略组件 */
export const MapView = withInstall(mapView);

export default MapView;
