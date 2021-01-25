import React from 'react'
import StatusBar from './StatusBar';
import Visualizer from './Visualizer';
import ParamsControl from './ParamsControl'
import Modulators from './Modulators'

export default function App() {
  return (
    <>
      <StatusBar />
      <Modulators />
      {/* <MyFixtures />
      <MyUniverse /> */}
      <ParamsControl />
      {/* <SplitPane style={{height: '200px', width: '100%'}} type="vertical" initialSplit={0.25} px={5}>
        <div style={{background: '#fff1', height: '100%'}}>Div One</div>
        <div style={{background: '#fff1', height: '100%'}}>Div Two</div>
      </SplitPane> */}
      <Visualizer style={{width: '100vw', height: '100vh'}} />
    </>
  )
}