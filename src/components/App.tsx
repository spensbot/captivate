import React from 'react'
import Time from './Time';
import FPS from './FPS';
import Visualizer from './Visualizer';
import ConnectionStatus from './ConnectionStatus';
import SplitPane from './SplitPane'

export default function App() {
  return (
    <>
      <SplitPane style={{height: '200px', width: '100%'}} type="vertical">
        <div style={{background: '#333', height: '100%'}}>Div One</div>
        <div style={{background: '#ddd', height: '100%'}}>Div Two</div>
      </SplitPane>
      <Time />
      <ConnectionStatus />
      <Visualizer style={{width: '100vw', height: '50vh'}} />
      <FPS />

    </>
  )
}