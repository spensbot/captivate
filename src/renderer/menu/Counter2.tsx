import { memo, useEffect, useRef } from 'react'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { StatusBarMeterSegment, StatusBarMeterTrack } from './statusBarUi'
import { registerBeatMeterUpdater } from './beatMeterDisplay'

function Counter2() {
  const quantum = useRealtimeSelector((state) => state.time.quantum)
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    segmentRefs.current.length = quantum
    return registerBeatMeterUpdater((phase, segmentCount) => {
      const activeIndex = Math.floor(phase)
      const activeFill = 1 - (phase % 1)
      for (let index = 0; index < segmentCount; index++) {
        const element = segmentRefs.current[index]
        if (element === null) {
          continue
        }
        const opacity =
          index === activeIndex ? Math.min(1, Math.max(0, activeFill)) : 0
        element.style.opacity = `${opacity}`
      }
    }, quantum)
  }, [quantum])

  return (
    <StatusBarMeterTrack title="Beat position in the current bar">
      {Array.from({ length: quantum }, (_, index) => (
        <StatusBarMeterSegment
          key={index}
          ref={(element) => {
            segmentRefs.current[index] = element
          }}
          $active={0}
        />
      ))}
    </StatusBarMeterTrack>
  )
}

export default memo(Counter2)
