import React from 'react'
import SplitPane from '../renderer/base/SplitPane'
import SceneSelection from '../renderer/scenes/SceneSelection'
import Modulators from '../renderer/scenes/Modulators'
import SplitScenes from '../renderer/scenes/SplitScenes'
import styled from 'styled-components'

export default function RemoteModulationPage() {
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  }

  return (
    <Root>
      <SplitPane
        style={splitPaneStyle}
        type="vertical"
        initialSplit={0.28}
        rem={0.5}
        min={0.18}
        max={0.45}
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
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Pane = styled.div`
  height: 100%;
  min-height: 0;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.65rem;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`

const ModulatorsHost = styled.div`
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
`

const Sp = styled.div`
  flex-shrink: 0;
  height: 0.65rem;
`
