import React from 'react'
import StatusBar from '../StatusBar'
import ParamsControl from '../controls/ParamsControl'
import Modulators from '../scenes/Modulators'
import SceneSelection from '../scenes/SceneSelection'
import SplitPane from '../base/SplitPane'
import VideoList from '../visualizer/VideoList'

export default function Scenes() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%', 
    },
    splitContainer: {
      flex: '1 1 auto',
      overflow: 'auto'
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Modulators />
            <ParamsControl />
            <VideoList />
          </div>
        </div>
      </SplitPane>
    </div>
  )
}