import { useEffect, useRef } from 'react'

type Ref = React.MutableRefObject<any>
type MouseEventHandler = React.MouseEventHandler<HTMLDivElement>

export default function useDragBasic(
  onChange: (e: React.MouseEvent) => void
): [Ref, MouseEventHandler] {
  const dragContainer = useRef(null)

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
    console.log('basic startListening')
    document.body.addEventListener('mousemove', onMouseMove)
    document.body.addEventListener('mouseup', onMouseUp)
    document.body.addEventListener('mouseleave', onMouseLeave)
  }

  const stopListening = () => {
    console.log('basic stopListening')
    document.body.removeEventListener('mousemove', onMouseMove)
    document.body.removeEventListener('mouseup', onMouseUp)
    document.body.removeEventListener('mouseleave', onMouseLeave)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (!e.defaultPrevented) {
      e.preventDefault()
      update(e)
      startListening()
    }
  }

  const update = (e: React.MouseEvent) => {
    onChange(e)
  }

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  return [dragContainer, onMouseDown]
}
