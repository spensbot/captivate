import { useState } from 'react'
import { useRealtimeSelector } from '../redux/realtimeStore'

export default function FPS() {
  const [isVisible, setIsVisible] = useState(true)
  function toggleIsVisible() {
    setIsVisible(!isVisible)
  }
  const color = isVisible ? '#fff7' : 'fff0'

  const dt = useRealtimeSelector((state) => state.time.dt)

  return (
    <div
      onClick={toggleIsVisible}
      style={{
        position: 'absolute',
        fontSize: '0.9rem',
        padding: '1rem',
        cursor: 'pointer',
        color: color,
        userSelect: 'none',
        top: 0,
        left: 0,
      }}
    >
      {`${Math.floor(1000 / dt)} FPS`}
    </div>
  )
}
