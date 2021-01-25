import {useEffect, useRef} from 'react'

export default function useDragMapped(onChange: (x: number, y: number) => void){
  const dragContainer = useRef()

  const onMouseMove = (e: React.MouseEvent) => {
    update(e)
  }

  const onMouseUp = (e:React.MouseEvent) => {
    stopListening()
  }

  const onMouseLeave = (e:React.MouseEvent) => {
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

  const onMouseDown = (e:React.MouseEvent) => {
    e.preventDefault()
    update(e)
    startListening()
  }

  const update = (e:React.MouseEvent) => {
    const {x, y} = getRelativePosition(e, dragContainer.current)

    onChange(x, y)
  }

  function clamp(val: number, min: number, max: number) {
    if (val < min) return min
    if (val > max) return max
    return val
  }

  function getRatio(val: number, min: number, max: number, range: number) {
    return (clamp(val, min, max) - min) / range
  }

  function getRelativePosition(e:React.MouseEvent, elem: Element){
    const {width, height, left, top, right, bottom} =  elem.getBoundingClientRect()
    return {
      x: getRatio(e.clientX, left, right, width),
      y: 1 - getRatio(e.clientY, top, bottom, height)
    }
  }

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  return [
    dragContainer,
    onMouseDown
  ]
}