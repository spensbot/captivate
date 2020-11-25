import React, { useEffect, useRef } from 'react'
import {visualizerResize, visualizerSetElement} from '../engine/engine'
import Time from './Time';
import FPS from './FPS';

export default function Home() {

  const threeJSDomElement = useRef(null)

  useEffect( () => {
    visualizerSetElement(threeJSDomElement.current);
    window.addEventListener('resize', visualizerResize);

    return () => {window.removeEventListener('resize', visualizerResize)};
  }, [])

  const styles = {
    webgl: {
      width: '50vw',
      height: '50vh',
    }
  }

  return (
    <>
    <Time />
    <div style={styles.webgl} ref={threeJSDomElement}></div>
    <FPS />
    </>
  )
}
