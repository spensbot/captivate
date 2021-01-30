import React, { useEffect, useRef } from 'react'
import { visualizerResize, visualizerSetElement } from '../engine/engine'
import FPS from './FPS'

type Props = {
  style: React.CSSProperties
}

export default function Visualizer({style}: Props) {

  const threeJSDomElement = useRef(null)

  useEffect( () => {
    visualizerSetElement(threeJSDomElement.current);
    window.addEventListener('resize', visualizerResize);

    return () => {window.removeEventListener('resize', visualizerResize)};
  }, [])

  return (
    <div style={{ ...style, position: 'relative' }} ref={threeJSDomElement}>
      <div style={{position: 'absolute', top:0, left: 0}}>
        <FPS />
      </div>
    </div>
  )
}
