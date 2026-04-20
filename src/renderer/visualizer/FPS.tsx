import { useRef } from 'react'
import {DynamicSustainRollingAverage, dynamicSustain} from 'shared/RollingAverage'

function getRollingAverage() {
  const avg = new DynamicSustainRollingAverage(60, dynamicSustain(20, 0.3))
  return avg
}

export default function FPS({ dt }: { dt: number }) {
  const avg = useRef(getRollingAverage())

  if (Number.isFinite(dt) && dt > 0) {
    avg.current.push(1000 / dt)
  }
  const current = avg.current.get()
  const safeFps = Number.isFinite(current) && current >= 0 ? current : 0

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
      {`${Math.floor(safeFps)} FPS`}
    </div>
  )
}
