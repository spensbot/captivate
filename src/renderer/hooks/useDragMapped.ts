import React, { useEffect, useRef } from 'react'

export interface MappedPos {
  x: number
  y: number
  dx: number
  dy: number
}

type Ref = React.MutableRefObject<any>
type MouseEventHandler = React.MouseEventHandler<HTMLDivElement>

export default function useDragMapped(
  onChange: (mappedPos: MappedPos, e: React.MouseEvent) => void
): [Ref, MouseEventHandler] {
  const dragContainer = useRef()

  const onMouseMove: MouseEventHandler = (e: React.MouseEvent) => {
    update(e)
  }

  const onMouseUp: MouseEventHandler = (_e: React.MouseEvent) => {
    stopListening()
  }

  const onMouseLeave: MouseEventHandler = (_e: React.MouseEvent) => {
    stopListening()
  }

  const startListening = () => {
    document.body.addEventListener('mousemove', onMouseMove)
    document.body.addEventListener('mouseup', onMouseUp)
    document.body.addEventListener('mouseleave', onMouseLeave)
  }

  const stopListening = () => {
    document.body.removeEventListener('mousemove', onMouseMove)
    document.body.removeEventListener('mouseup', onMouseUp)
    document.body.removeEventListener('mouseleave', onMouseLeave)
  }

  const onMouseDown: MouseEventHandler = (e: React.MouseEvent) => {
    e.preventDefault()
    update(e)
    startListening()
  }

  const update = (e: React.MouseEvent) => {
    const { width, height, left, top, right, bottom } =
      dragContainer.current.getBoundingClientRect()
    onChange(
      {
        x: getRatio(e.clientX, left, right, width),
        y: 1 - getRatio(e.clientY, top, bottom, height),
        dx: e.movementX / width,
        dy: -e.movementY / height,
      },
      e
    )
  }

  function clamp(val: number, min: number, max: number) {
    if (val < min) return min
    if (val > max) return max
    return val
  }

  function getRatio(val: number, min: number, max: number, range: number) {
    return (clamp(val, min, max) - min) / range
  }

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  return [dragContainer, onMouseDown]
}
