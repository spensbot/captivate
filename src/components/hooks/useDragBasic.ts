import {useEffect, useRef} from 'react'

export default function useDragBasic(onChange: (e:React.MouseEvent) => void){
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

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    update(e)
    startListening()
  }

  const update = (e: React.MouseEvent) => {
    onChange(e)
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