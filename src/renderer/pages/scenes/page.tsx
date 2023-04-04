import React from 'react'
import StatusBar from '../../menu/StatusBar'
import Modulators from '../../../features/modulation/react'
import SceneSelection from '../../../features/scenes/react/scenes/SceneSelection'
import SplitPane from '../../../features/ui/react/base/SplitPane'
import styled from 'styled-components'
import SplitScenes from 'features/scenes/react/scenes/SplitScenes'

export default function Scenes() {
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 auto',
    overflow: 'auto',
  }

  return (
    <Root>
      <StatusBar />
      <SplitPane
        style={splitPaneStyle}
        type="vertical"
        initialSplit={0.3}
        rem={0.5}
        min={0.2}
        max={0.5}
      >
        <Pane>
          <SceneSelection sceneType="light" />
        </Pane>
        <Pane>
          <Column>
            <Modulators />
            <Sp />
            <SplitScenes />
          </Column>
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

const Column = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
`

const Sp = styled.div`
  height: 1rem;
`
