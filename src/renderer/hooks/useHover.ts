import { useEffect, useRef, useState } from 'react'

export default function useHover() {
  const [isHover, setIsHover] = useState(false)
  const hoverDiv = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = hoverDiv.current
    if (node === null) {
      return
    }
    const onEnter = () => setIsHover(true)
    const onLeave = () => setIsHover(false)
    node.addEventListener('mouseenter', onEnter)
    node.addEventListener('mouseleave', onLeave)
    return () => {
      node.removeEventListener('mouseenter', onEnter)
      node.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return { hoverDiv, isHover }
}
