import { useRef, useEffect } from 'react'
import FPS from '../visualizer/FPS'
import VisualizerManager from 'visualizer/threejs/VisualizerManager'
import styled from 'styled-components'
import { realtimeStore, useRealtimeSelector } from '../redux/realtimeStore'
import { store, getCleanReduxState } from '../redux/store'
import OpenVisualizerButton from 'renderer/visualizer/OpenVisualizerButton'

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

  return (
    <Root ref={visualizerDiv}>
      <FPS dt={dt.current} />
      <OpenVisualizerButton />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  background-color: #000;
  flex: 1 0 0;
  height: 60vh;
  overflow: auto;
`
