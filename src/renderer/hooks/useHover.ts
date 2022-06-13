import { useEffect, useRef, useState } from 'react'

export default function useHover() {
  const [isHover, setIsHover] = useState(false)
  const hoverDiv = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (hoverDiv.current) {
      hoverDiv.current.addEventListener('mouseenter', () => setIsHover(true))
      hoverDiv.current.addEventListener('mouseleave', () => setIsHover(false))
    }
  }, [])

  return { hoverDiv, isHover }
}
