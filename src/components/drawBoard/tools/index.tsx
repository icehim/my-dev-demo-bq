import App from '../utils/App';
import Toolbar from './Toolbar';
import ToolbarMenu from './ToolbarMenu';
import Menu from './Menu';

const Index = () => {
  return (
    <div className="toolsIndex">
      <Toolbar />

      {App.drawingBoardInstance?.tools?.toolbarActiveIndex ? (
        <ToolbarMenu />
      ) : null}

      <Menu />
    </div>
  );
};

export default Index;
