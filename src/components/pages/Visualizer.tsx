import React, {useRef, useEffect} from 'react'
import FPS from '../visualizer/FPS'
import {visualizerRef, resizeVisualizer} from '../visualizer/visualizerRef'

export default function Visualizer() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100vw',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#000'
    },
  }

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
  
    return () => {window.removeEventListener('resize', resize)};
  }, [])

  return (
    <div style={styles.root} ref={ref}>
      <FPS />
    </div>
  )
}