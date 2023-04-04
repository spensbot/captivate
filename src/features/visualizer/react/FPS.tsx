import { useRef } from 'react'
import {DynamicSustainRollingAverage, dynamicSustain} from 'shared/RollingAverage'

function getRollingAverage() {
  const avg = new DynamicSustainRollingAverage(60, dynamicSustain(20, 0.3))
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
        userSelect: 'none',
        top: 0,
        left: 0,
      }}
    >
      {`${Math.floor(avg.current.get())} FPS`}
    </div>
  )
}
