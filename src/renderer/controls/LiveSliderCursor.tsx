import { memo, useEffect, useRef } from 'react'
import { useOutputParam } from '../redux/realtimeStore'
import { DefaultParam } from '../../shared/params'
import {
  registerSmoothedMotion,
  snapSmoothedMotionToTarget,
  wakeSmoothedMotionLoop,
  type SmoothedMotionEntry,
} from '../hooks/smoothedMotionBus'

interface Props {
  param: DefaultParam | string
  radius: number
  orientation: 'vertical' | 'horizontal'
  splitIndex: number
  color?: string
  tauMs?: number
}

const DEFAULT_TAU_MS = 36

function LiveSliderCursor({
  param,
  radius,
  orientation,
  splitIndex,
  color = '#fffa',
  tauMs = DEFAULT_TAU_MS,
}: Props) {
  const value = useOutputParam(param, splitIndex)
  const targetRef = useRef(value)
  targetRef.current = value

  const cursorRef = useRef<HTMLDivElement>(null)
  const entryRef = useRef<SmoothedMotionEntry | null>(null)

  useEffect(() => {
    const el = cursorRef.current
    if (el === null) {
      return
    }

    const vertical = orientation === 'vertical'
    const entry: SmoothedMotionEntry = {
      readTarget: () => targetRef.current,
      display: targetRef.current,
      tauMs,
      apply: (next) => {
        const percent = next * 100
        if (vertical) {
          el.style.bottom = `${percent}%`
        } else {
          el.style.left = `${percent}%`
        }
      },
    }
    entryRef.current = entry
    snapSmoothedMotionToTarget(entry)
    return registerSmoothedMotion(entry)
  }, [orientation, tauMs])

  useEffect(() => {
    const entry = entryRef.current
    if (entry === null) {
      return
    }
    if (Math.abs(targetRef.current - entry.display) > 0.002) {
      wakeSmoothedMotionLoop()
    }
  }, [value])

  const r = `${radius * 2}rem`
  const d = `${radius * 2}rem`
  const vertical = orientation === 'vertical'
  const initialPercent = targetRef.current * 100

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'absolute',
        width: d,
        height: d,
        borderRadius: r,
        bottom: vertical ? `${initialPercent}%` : 0,
        left: vertical ? 0 : `${initialPercent}%`,
        backgroundColor: color,
        transform: `translate(${vertical ? 0 : -radius}rem, ${vertical ? radius : 0}rem)`,
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    />
  )
}

export default memo(LiveSliderCursor)
