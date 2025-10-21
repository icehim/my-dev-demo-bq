import DrawingBoard from './DrawingBoard';
import type { IAppProps } from './types';

class App {
  static drawingBoardInstance: null | DrawingBoard = null;

  static init = ({ domId, onChange, config = {} }: IAppProps) => {
    this.drawingBoardInstance = new DrawingBoard({
      domId,
      onChange,
      config
    });
  };

  static destroy() {
    this.drawingBoardInstance && this.drawingBoardInstance.destroy();
  }
}

export default App;
