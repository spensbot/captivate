import { useEffect, useRef } from 'react'
import { useStore } from 'react-redux'
import { getCleanReduxState, type ReduxState } from '../redux/store'

/** Keeps keyboard focus in the renderer while assigning shortcuts. */
export default function KeyboardMappingFocus() {
  const store = useStore()
  const focusSinkRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const focusSink = () => {
      const dev = getCleanReduxState(store.getState() as ReduxState).control.device
      if (!dev?.keyboardListening) return
      window.focus()
      focusSinkRef.current?.focus({ preventScroll: true })
    }
    focusSink()
    return store.subscribe(focusSink)
  }, [store])

  return (
    <div
      ref={focusSinkRef}
      tabIndex={-1}
      aria-hidden
      style={{
        position: 'fixed',
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        left: 0,
        top: 0,
      }}
    />
  )
}
