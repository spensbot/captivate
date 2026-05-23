import React from 'react'
import StatusBar from '../menu/StatusBar'
import Modulators from '../scenes/Modulators'
import SceneSelection from '../scenes/SceneSelection'
import SplitPane from '../base/SplitPane'
import styled from 'styled-components'
import SplitScenes from 'renderer/scenes/SplitScenes'

export default function Scenes() {
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
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
            <ModulatorsHost>
              <Modulators />
            </ModulatorsHost>
            <Sp />
            <SplitScenes />
          </Column>
        </Pane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`

const Pane = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
`

const ModulatorsHost = styled.div`
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
`

const Sp = styled.div`
  flex-shrink: 0;
  height: 1rem;
`
