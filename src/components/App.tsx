import React from 'react'
import Time from './Time';
import FPS from './FPS';
import Visualizer from './Visualizer';
import ConnectionStatus from './ConnectionStatus';
import SplitPane from './SplitPane'
import Hue from './Hue';
import SVpad from './SVpad'

export default function App() {
  return (
    <>
      <SVpad />
      <Hue />
      <SplitPane style={{height: '200px', width: '100%'}} type="vertical" initialSplit={0.25} px={5}>
        <div style={{background: '#fff2', height: '100%'}}>Div One</div>
        <div style={{background: '#fff2', height: '100%'}}>Div Two</div>
      </SplitPane>
      <Time />
      <ConnectionStatus />
      <Visualizer style={{width: '100vw', height: '50vh'}} />
      <FPS />

    </>
  )
}