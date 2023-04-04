import React, { useEffect, useRef } from 'react'

type Ref = React.MutableRefObject<any>
type MouseEventHandler = (e: MouseEvent) => any

export default function useDragBasic(
  onChange: (e: MouseEvent) => void
): [Ref, React.MouseEventHandler<HTMLDivElement>] {
  const dragContainer = useRef(null)

  const onMouseMove: MouseEventHandler = (e: MouseEvent) => {
    update(e)
  }

  const onMouseUp: MouseEventHandler = (_e: MouseEvent) => {
    stopListening()
  }

  const onMouseLeave: MouseEventHandler = (_e: MouseEvent) => {
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

  const onMouseDown = (e: MouseEvent) => {
    if (!e.defaultPrevented) {
      e.preventDefault()
      update(e)
      startListening()
    }
  }

  const update = (e: MouseEvent) => {
    onChange(e)
  }

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  return [dragContainer, onMouseDown as unknown as React.MouseEventHandler]
}
