import React from 'react'
import StatusBar from './StatusBar';
import Visualizer from './Visualizer';
import HsvPad from './HsvPad'
import XYpad from './XYpad';
import LfoVisualizer from './LfoVisualizer'

export default function App() {
  return (
    <>
      <StatusBar />
      <LfoVisualizer lfoIndex={0} />
      {/* <MyFixtures />
      <MyUniverse /> */}
      <XYpad />
      <HsvPad />
      {/* <SplitPane style={{height: '200px', width: '100%'}} type="vertical" initialSplit={0.25} px={5}>
        <div style={{background: '#fff1', height: '100%'}}>Div One</div>
        <div style={{background: '#fff1', height: '100%'}}>Div Two</div>
      </SplitPane> */}
      <Visualizer style={{width: '100vw', height: '100vh'}} />
    </>
  )
}