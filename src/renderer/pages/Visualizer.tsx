import { useRef, useEffect } from 'react'
import FPS from '../visualizer_old/FPS'
import VisualizerManager from '../visualizer/VisualizerManager'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { useTypedSelector } from '../redux/store'

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

  return (
    <Root>
      <StatusBar />
      <Window ref={ref}>
        <FPS />
      </Window>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Window = styled.div`
  width: 100%;
  position: relative;
  background-color: #000;
  flex: 1 0 0;
`
