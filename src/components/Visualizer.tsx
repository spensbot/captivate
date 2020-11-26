import React, { useEffect, useRef } from 'react'
import {visualizerResize, visualizerSetElement} from '../engine/engine'

export default function Visualizer({style}) {

  const threeJSDomElement = useRef(null)

  useEffect( () => {
    visualizerSetElement(threeJSDomElement.current);
    window.addEventListener('resize', visualizerResize);

    return () => {window.removeEventListener('resize', visualizerResize)};
  }, [])

  return (
    <div style={style} ref={threeJSDomElement}></div>
  )
}
