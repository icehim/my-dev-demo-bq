import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

export default function ExcalidrawPure() {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Excalidraw />
    </div>
  );
}
