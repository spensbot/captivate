import React from 'react'
import StatusBar from '../menu/StatusBar'
import ParamsControl from '../controls/ParamsControl'
import Modulators from '../scenes/Modulators'
import SceneSelection from '../scenes/SceneSelection'
import SplitPane from '../base/SplitPane'
import VideoList from '../visualizer/VideoList'
import Groups from '../scenes/Groups'
import styled from 'styled-components'

export default function Scenes() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    splitContainer: {
      flex: '1 1 auto',
      overflow: 'auto',
    },
    splitPane: {
      height: '100%',
    },
  }

  return (
    <Root>
      <StatusBar />
      <SplitPane
        style={styles.splitContainer}
        type="vertical"
        initialSplit={0.3}
        rem={0.5}
        min={0.2}
        max={0.5}
      >
        <Pane>
          <SceneSelection />
        </Pane>
        <Pane>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
            }}
          >
            <Modulators />
            <Sp />
            <ParamsControl />
            {/* <VideoList /> */}

            {/* <Groups /> */}
          </div>
        </Pane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const Pane = styled.div`
  height: 100%;
`

const Sp = styled.div`
  height: 1rem;
`
