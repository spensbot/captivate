import { useLayoutEffect, useRef, useState } from 'react'

export default function useBounds(): [
  React.RefObject<HTMLDivElement>,
  DOMRect | null
] {
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, boundsUpdated] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    function updateBounds() {
      if (ref !== null) {
        //@ts-ignore: Typscript doesn't realize that this works
        let rect = ref.current.getBoundingClientRect()
        boundsUpdated(rect)
      }
    }
    updateBounds()
    window.addEventListener('resize', updateBounds)
    return () => window.removeEventListener('resize', updateBounds)
  }, [])

  return [ref, bounds]
}
