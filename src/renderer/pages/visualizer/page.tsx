import styled from 'styled-components'
import StatusBar from '../../../features/menu/react/StatusBar'
import SplitPane from '../../../features/ui/react/base/SplitPane'
import SceneSelection from '../../../features/scenes/react/scenes/SceneSelection'
import VisualizerSceneEditor from 'features/visualizer/react/VisualizerSceneEditor'
import Effects from 'features/visualizer/react/Effects'
import Visualizer from 'features/visualizer/react/Visualizer'

export default function VisualizerPage() {
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
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
          <SceneSelection sceneType="visual" />
        </Pane>
        <SplitPane
          style={{ height: '100%' }}
          type="horizontal"
          initialSplit={0.6}
          rem={0.5}
          min={0.2}
          max={0.8}
        >
          <Visualizer />
          <SplitPane
            style={{ flex: '0.8 0 0', height: '100%' }}
            type="vertical"
            initialSplit={0.4}
            rem={0.5}
            min={0.3}
            max={0.7}
          >
            <Pane>
              <VisualizerSceneEditor />
            </Pane>
            <Pane>
              <Effects />
            </Pane>
          </SplitPane>
        </SplitPane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Pane = styled.div`
  height: 100%;
`
