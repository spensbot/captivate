import React from 'react'
import Time from './Time';
import FPS from './FPS';
import Visualizer from './Visualizer';

export default function Home() {
  return (
    <>
      <Time />
      <Visualizer style={{width: '100vw', height: '50vh'}} />
      <FPS />
    </>
  )
}
