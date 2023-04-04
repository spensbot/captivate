import React, { useEffect, useRef } from 'react'

export interface MappedPos {
  x: number
  y: number
  dx: number
  dy: number
}

type Ref = React.MutableRefObject<any>
type MouseEventHandler = (e: MouseEvent) => any

type DragStatus = 'Start' | 'Moved' | 'End'

type Handler = (mappedPos: MappedPos, e: MouseEvent, status: DragStatus) => void

export default function useDragMapped(
  onChange: Handler
): [Ref, React.MouseEventHandler<HTMLDivElement>] {
  const dragContainer = useRef<Element>(null)

  const onMouseMove: MouseEventHandler = (e: MouseEvent) => {
    update(e, 'Moved')
  }

  const onMouseUp: MouseEventHandler = (e: MouseEvent) => {
    update(e, 'End')
    stopListening()
  }

  const onMouseLeave: MouseEventHandler = (e: MouseEvent) => {
    update(e, 'End')
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

  const onMouseDown: MouseEventHandler = (e: MouseEvent) => {
    if (!e.defaultPrevented) {
      e.preventDefault()
      update(e, 'Start')
      startListening()
    }
  }

  const update = (e: MouseEvent, status: DragStatus) => {
    if (dragContainer.current !== null) {
      const { width, height, left, top, right, bottom } =
        dragContainer.current.getBoundingClientRect()
      onChange(
        {
          x: getRatio(e.clientX, left, right, width),
          y: 1 - getRatio(e.clientY, top, bottom, height),
          dx: e.movementX / width,
          dy: -e.movementY / height,
        },
        e,
        status
      )
    }
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

  return [
    dragContainer,
    onMouseDown as unknown as React.MouseEventHandler<HTMLDivElement>,
  ]
}
