import { useRef, useEffect } from 'react'
import FPS from '../visualizer/FPS'
import { visualizerRef, resizeVisualizer } from '../visualizer/visualizerRef'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'

export default function Visualizer() {
  const ref = useRef(null)

  function resize() {
    const element = ref.current
    if (element !== null) {
      resizeVisualizer(element.clientWidth, element.clientHeight)
    }
  }

  useEffect(() => {
    const element = ref.current
    if (element !== null) {
      element.appendChild(visualizerRef)
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
