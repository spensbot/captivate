import React from 'react'
import StatusBar from '../StatusBar'
import ParamsControl from '../controls/ParamsControl'
import Modulators from '../modulators/Modulators'
import SceneSelection from '../SceneSelection'
import SplitPane from '../base/SplitPane'

export default function Scenes() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%', 
    },
    splitContainer: {
      flex: '1 0 0',
      overflow: 'hidden'
    },
    splitPane: {
      height: '100%'
    }
  }

  return (
    <div style={styles.root}>
      <StatusBar />
      <SplitPane style={styles.splitContainer} type="vertical" initialSplit={0.30} rem={0.5}>
        <div style={styles.splitPane}>
          <SceneSelection />
        </div>
        <div style={styles.splitPane}>
          <Modulators />
          <ParamsControl />
        </div>
      </SplitPane>
    </div>
  )
}