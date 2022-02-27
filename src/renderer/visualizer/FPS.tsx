import { useRef } from 'react'
import RollingAverage from 'shared/RollingAverage'

function getRollingAverage() {
  const avg = new RollingAverage()
  avg.setSustainSamples(30)
  return avg
}

export default function FPS({ dt }: { dt: number }) {
  const avg = useRef(getRollingAverage())

  avg.current.push(1000 / dt)

  return (
    <div
      style={{
        position: 'absolute',
        fontSize: '0.9rem',
        padding: '1rem',
        cursor: 'pointer',
        userSelect: 'none',
        top: 0,
        left: 0,
      }}
    >
      {`${Math.floor(avg.current.get())} FPS`}
    </div>
  )
}
