import React from 'react'
import SplitPane from '../base/SplitPane'
import MyFixtures from '../dmx/MyFixtures'
import MyUniverse from '../dmx/MyUniverse'
import Groups from '../dmx/Groups'

export default function Universe() {

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      height: '100%'
    }
  }

  return (
    <>
      <SplitPane style={{height: '100vh', width: '100%'}} type="vertical" initialSplit={0.30} rem={0.5} min={0.2} max={0.6}>
        <div style={styles.root}>
          <SplitPane style={{height: '100%', width: '100%'}} type="horizontal" initialSplit={0.5} rem={0.5} min={0.25} max={0.75}>
            <MyFixtures />
            <Groups />
          </SplitPane>
        </div>
        <div style={styles.root}>
          <MyUniverse />
        </div>
      </SplitPane>
    </>
  )
}