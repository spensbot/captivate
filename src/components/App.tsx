import React from 'react'
import Time from './Time';
import FPS from './FPS';
import Visualizer from './Visualizer';
import ConnectionStatus from './ConnectionStatus';

export default function App() {
  return (
    <>
      <Time />
      <ConnectionStatus />
      <Visualizer style={{width: '100vw', height: '50vh'}} />
      <FPS />
    </>
  )
}
