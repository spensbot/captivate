import React from 'react'
import SplitPane from '../base/SplitPane'
import MyFixtures from '../dmx/MyFixtures'
import MyUniverse from '../dmx/MyUniverse'

export default function Universe() {

  return (
    <>
      <SplitPane style={{height: '30rem', width: '100%'}} type="vertical" initialSplit={0.25} px={5}>
        <div style={{background: '#fff1', height: '100%'}}>Div One</div>
        <div style={{background: '#fff1', height: '100%'}}>Div Two</div>
      </SplitPane>
      <MyFixtures />
      <MyUniverse />
    </>
  )
}