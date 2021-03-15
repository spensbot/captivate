import React, { useEffect, useRef } from 'react'

const style: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
}

type Props = {
  childElement: HTMLElement
  onResize: (width: number, height: number) => void
}

export default function VisualizerContainer({childElement, onResize}: Props) {

  const domElement = useRef(null)
  
  const resize = () => {
    const ref = domElement.current
    if (ref !== null) {
      onResize(ref.clientWidth, ref.clientHeight);
    }
  }

  useEffect(() => {
    const ref = domElement.current
    if (ref !== null) {
      ref.appendChild(childElement)
    }
    resize()
    window.addEventListener('resize', resize);

    return () => {window.removeEventListener('resize', resize)};
  }, [])

  return (
    <div style={style} ref={domElement} />
  )
}
