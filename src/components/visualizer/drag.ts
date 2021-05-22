import React from "react"

export interface MappedPos {
  x: number,
  y: number,
  dx: number,
  dy: number
}

export default function setupDrag(element: HTMLDivElement, onChange: (mappedPos: MappedPos, e: MouseEvent) => void) {
  const onMouseMove = (e: MouseEvent) => {
    update(e)
  }

  const onMouseUp = (e: MouseEvent) => {
    stopListening()
  }

  const onMouseLeave = (e: MouseEvent) => {
    stopListening()
  }

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    update(e)
    startListening()
  }

  element.onmousedown = onMouseDown

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

  const update = (e: MouseEvent) => {
    const {width, height, left, top, right, bottom} = element.getBoundingClientRect()
    onChange ({
      x: getRatio(e.clientX, left, right, width),
      y: 1 - getRatio(e.clientY, top, bottom, height),
      dx: e.movementX / width,
      dy: - e.movementY / height
    }, e)
  }

  function clamp(val: number, min: number, max: number) {
    if (val < min) return min
    if (val > max) return max
    return val
  }

  function getRatio(val: number, min: number, max: number, range: number) {
    return (clamp(val, min, max) - min) / range
  }
}