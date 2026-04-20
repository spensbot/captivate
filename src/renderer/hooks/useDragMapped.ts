import React, { useCallback, useEffect, useRef, useState } from 'react'

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
  const onChangeRef = useRef(onChange)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  function clamp(val: number, min: number, max: number) {
    if (val < min) return min
    if (val > max) return max
    return val
  }

  function getRatio(val: number, min: number, max: number, range: number) {
    return (clamp(val, min, max) - min) / range
  }

  const update = useCallback((e: MouseEvent, status: DragStatus) => {
    if (dragContainer.current !== null) {
      const { width, height, left, top, right, bottom } =
        dragContainer.current.getBoundingClientRect()
      onChangeRef.current(
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
  }, [])

  const onMouseDown: MouseEventHandler = useCallback(
    (e: MouseEvent) => {
      if (!e.defaultPrevented) {
        e.preventDefault()
        update(e, 'Start')
        setIsDragging(true)
      }
    },
    [update]
  )

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove: MouseEventHandler = (e: MouseEvent) => {
      update(e, 'Moved')
    }

    const onMouseUp: MouseEventHandler = (e: MouseEvent) => {
      update(e, 'End')
      setIsDragging(false)
    }

    const onMouseLeave: MouseEventHandler = (e: MouseEvent) => {
      update(e, 'End')
      setIsDragging(false)
    }

    document.body.addEventListener('mousemove', onMouseMove)
    document.body.addEventListener('mouseup', onMouseUp)
    document.body.addEventListener('mouseleave', onMouseLeave)

    return () => {
      document.body.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseup', onMouseUp)
      document.body.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [isDragging, update])

  return [
    dragContainer,
    onMouseDown as unknown as React.MouseEventHandler<HTMLDivElement>,
  ]
}
