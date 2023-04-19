import { useRef, useEffect } from 'react'
import FPS from './FPS'
import VisualizerManager from 'features/visualizer/threejs/VisualizerManager'
import styled from 'styled-components'
import { realtimeStore, useRealtimeSelector } from '../../../renderer/redux/realtimeStore'
import { store, getCleanReduxState } from '../../../renderer/redux/store'
import OpenVisualizerButton from './OpenVisualizerButton'

export default function Visualizer() {
  const visualizerDiv = useRef<null | HTMLDivElement>(null)
  const dt = useRef<number>(60)
  useRealtimeSelector((state) => state)

  useEffect(() => {
    let lastUpdateTime: number | null = null
    const vm = new VisualizerManager()
    const element = visualizerDiv.current
    if (element === null) return

    element.appendChild(vm.getElement())

    const resize = () => {
      vm.resize(element.clientWidth, element.clientHeight)
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

    let resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(element)

    resize()
    animateVisualizer()

    return () => {
      resizeObserver.disconnect()
      animateVisualizer = () => {}
      vm.ruthlessly_nuke_all_memory_I_dont_even_care_kill_it_with_fire()
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
  flex: 1 0 0;
  height: 100%;
  overflow: auto;
`
