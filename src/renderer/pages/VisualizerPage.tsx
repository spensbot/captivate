import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import StatusBar from '../menu/StatusBar'
import SplitPane from '../base/SplitPane'
import SceneSelection from '../scenes/SceneSelection'
import VisualizerSceneEditor from 'renderer/visualizer/VisualizerSceneEditor'
import Visualizer from 'renderer/visualizer/Visualizer'
import VisualizerContainerSelector from 'renderer/visualizer/VisualizerContainerSelector'
import { useActiveVisualScene, useTypedSelector } from '../redux/store'
import { toggleVideoEnabled } from '../redux/guiSlice'
import { setVisualSceneConfig } from '../redux/controlSlice'

interface VisualizerPageProps {
  standalone?: boolean
}

export default function VisualizerPage({ standalone = false }: VisualizerPageProps) {
  const dispatch = useDispatch()
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const visualSceneConfig = useActiveVisualScene((scene) => scene.config)
  const projectionMappingEnabled = visualSceneConfig.projectionMapping.enabled === true
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  }

  return (
    <Root>
      {!standalone && <StatusBar />}
      <SplitPane
        style={splitPaneStyle}
        type="vertical"
        initialSplit={0.3}
        rem={0.5}
        min={0.2}
        max={0.5}
      >
        <LeftPane>
          <SelectorRow>
            <VisualizerContainerSelector />
          </SelectorRow>
          <ToggleRow>
            <ToggleButton
              type="button"
              $active={videoEnabled}
              onClick={() => dispatch(toggleVideoEnabled())}
              title="Enable or disable visualizer rendering output"
            >
              Visualizer {videoEnabled ? 'On' : 'Off'}
            </ToggleButton>
          </ToggleRow>
          <ToggleRow>
            <ToggleButton
              type="button"
              $active={projectionMappingEnabled}
              onClick={() =>
                dispatch(
                  setVisualSceneConfig({
                    ...visualSceneConfig,
                    projectionMapping: {
                      ...visualSceneConfig.projectionMapping,
                      enabled: !projectionMappingEnabled,
                    },
                  })
                )
              }
              title="Toggle projection mapping edit mode for this visual scene"
            >
              Projection Mapping {projectionMappingEnabled ? 'On' : 'Off'}
            </ToggleButton>
          </ToggleRow>
          <SceneSelectionWrap>
            <SceneSelection sceneType="visual" />
          </SceneSelectionWrap>
        </LeftPane>
        <SplitPane
          style={{ height: '100%' }}
          type="horizontal"
          initialSplit={0.6}
          rem={0.5}
          min={0.35}
          max={0.9}
        >
          {videoEnabled ? (
            <Visualizer />
          ) : (
            <VisualizerDisabled>
              Visualizer output is off. Turn it on from the toggle in the left panel.
            </VisualizerDisabled>
          )}
          <EditorPane>
            <VisualizerSceneEditor />
          </EditorPane>
        </SplitPane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`

const Pane = styled.div`
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`

const EditorPane = styled(Pane)`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable both-edges;
`

const LeftPane = styled(Pane)`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.45rem;
  box-sizing: border-box;
`

const SelectorRow = styled.div`
  flex: 0 0 auto;
  min-width: 0;
`

const SceneSelectionWrap = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
`

const ToggleRow = styled.div`
  flex: 0 0 auto;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  width: 100%;
  border: 1px solid ${(props) => (props.$active ? '#7ed6a5' : '#ffffff33')};
  background: ${(props) => (props.$active ? '#154d2e' : '#0007')};
  color: #dfe8f8;
  border-radius: 0.32rem;
  padding: 0.34rem 0.5rem;
  text-align: left;
  cursor: pointer;
`

const VisualizerDisabled = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.colors.text.secondary};
  padding: 1rem;
  box-sizing: border-box;
`
