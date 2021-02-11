import React from 'react'
import SplitPane from '../base/SplitPane'
import MyFixtures from '../dmx/MyFixtures'
import MyUniverse from '../dmx/MyUniverse'

export default function Universe() {

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      height: '100%',
      padding: '0.5rem'
    }
  }

  return (
    <>
      <SplitPane style={{height: '30rem', width: '100%'}} type="vertical" initialSplit={0.30} px={5}>
        <div style={styles.root}>
          <MyFixtures />
        </div>
        <div style={styles.root}>
          <MyUniverse />
        </div>
      </SplitPane>
    </>
  )
}