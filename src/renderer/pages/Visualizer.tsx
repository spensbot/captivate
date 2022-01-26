import { useRef, useEffect } from 'react'
import FPS from '../visualizer/FPS'
import VisualizerManager from '../visualizer/VisualizerManager'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { useTypedSelector } from '../redux/store'
import SplitPane from '../base/SplitPane'
import VisualizerSceneSelection from '../visualizer/VisualizerSceneSelection'

const visualizer = new VisualizerManager()

export default function Visualizer() {
  const ref = useRef(null)

  const state = useTypedSelector((state) => state)
  const rs = useRealtimeSelector((rs) => rs)

  visualizer.update(rs, state)

  function resize() {
    const element = ref.current
    if (element !== null) {
      visualizer.resize(element.clientWidth, element.clientHeight)
    }
  }

  useEffect(() => {
    const element = ref.current
    if (element !== null) {
      element.appendChild(visualizer.getElement())
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

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
          <VisualizerSceneSelection />
        </Pane>
        <Pane>
          <Window ref={ref}>
            <FPS />
          </Window>
        </Pane>
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
  width: 100%;
  position: relative;
  background-color: #000;
  flex: 1 1 0;
  overflow: auto;
`

const Pane = styled.div`
  height: 100%;
`
