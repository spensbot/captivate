import { Point } from 'features/utils/math/point'
import { useEffect, useState } from 'react'

// Apparently there's no way to get the position of the mouse without a mouse event...
// So here's a hacky way to persist the last mouse position
let globalLastMousePosition: Point = {
  x: 0,
  y: 0,
}

export default function useMousePosition() {
  const [pos, setPos] = useState<Point>(globalLastMousePosition)
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      const newPos = {
        x: e.clientX,
        y: e.clientY,
      }
      globalLastMousePosition = newPos
      setPos(newPos)
    }
    window.addEventListener('mousemove', listener)
    return () => {
      window.removeEventListener('mousemove', listener)
    }
  }, [])
  return pos
}
