import { useRef, useEffect } from 'react'
import FPS from '../visualizer/FPS'
import VisualizerManager from '../visualizer/threejs/VisualizerManager'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import { realtimeStore, useRealtimeSelector } from '../redux/realtimeStore'
import { store, getCleanReduxState } from '../redux/store'
import SplitPane from '../base/SplitPane'
import SceneSelection from '../scenes/SceneSelection'
import OpenVisualizerButton from 'renderer/visualizer/OpenVisualizerButton'
import VisualizerSceneEditor from 'renderer/visualizer/VisualizerSceneEditor'
import Effects from 'renderer/visualizer/Effects'

export default function Visualizer() {
  const visualizerDiv = useRef<null | HTMLDivElement>(null)
  const dt = useRef<number>(60)
  useRealtimeSelector((state) => state)

  useEffect(() => {
    let lastUpdateTime: number | null = null
    const vm = new VisualizerManager()
    const element = visualizerDiv.current
    if (element !== null) {
      element.appendChild(vm.getElement())
    }

    const resize = () => {
      const element = visualizerDiv.current
      if (element !== null) {
        vm.resize(element.clientWidth, element.clientHeight)
      }
    }

    let animateVisualizer = () => {
      const now = Date.now()
      if (lastUpdateTime !== null) {
        dt.current = now - lastUpdateTime
      }
      lastUpdateTime = now
      vm.update(dt.current, {
        rt: realtimeStore.getState(),
        state: getCleanReduxState(store.getState()),
      })
      requestAnimationFrame(animateVisualizer)
    }

    resize()
    window.addEventListener('resize', resize)
    animateVisualizer()

    return () => {
      window.removeEventListener('resize', resize)
      animateVisualizer = () => {}
    }
  }, [])

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
        <VisualizerPane>
          <Window ref={visualizerDiv}>
            <FPS dt={dt.current} />
            <OpenVisualizerButton />
          </Window>
          <SplitPane
            style={{ flex: '0.8 0 0' }}
            type="vertical"
            initialSplit={0.4}
            rem={0.5}
            min={0.2}
            max={0.5}
          >
            <Pane style={{ borderRight: `1px solid #777` }}>
              <VisualizerSceneEditor />
            </Pane>
            <Pane>
              <Effects />
            </Pane>
          </SplitPane>
        </VisualizerPane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
`

const Window = styled.div`
  position: relative;
  background-color: #000;
  flex: 1 0 0;
  height: 60vh;
  overflow: auto;
`

const Pane = styled.div`
  height: 100%;
`

const VisualizerPane = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`
