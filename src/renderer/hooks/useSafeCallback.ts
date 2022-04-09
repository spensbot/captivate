import { useRef, useEffect } from 'react'

// Wraps the given callback in a function that won't call it after the component unmounts
export default function <Args>(cb: (args: Args) => void): (args: Args) => void {
  const isMounted = useRef(true)
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  return (args) => {
    if (isMounted.current === true) {
      cb(args)
    }
  }
}
