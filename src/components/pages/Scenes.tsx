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
      flexDirection: 'row'
    },
    activePage: {
      flex: '1 0 0'
    },
    split: {
      height: '100%',
      maxHeight: '100%'
    }
  }

  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
      <StatusBar />
      <SplitPane style={{ flex: '1 0 0' }} type="vertical" initialSplit={0.30} rem={0.5}>
        <div style={styles.split}>
          <SceneSelection />
        </div>
        <div style={styles.split}>
          <Modulators />
          <ParamsControl />
        </div>
      </SplitPane>
    </div>
  )
}