import { memo, useEffect, useRef } from 'react'
import { useDmxMixerChannelOutput } from '../dmx/dmxMixerOutputBus'
import {
  registerSmoothedMotion,
  snapSmoothedMotionToTarget,
  wakeSmoothedMotionLoop,
  type SmoothedMotionEntry,
} from '../hooks/smoothedMotionBus'

interface Props {
  universe: number
  channelIndex: number
  radius: number
  orientation: 'vertical' | 'horizontal'
  color?: string
  /** Time constant for output level smoothing (ms). */
  tauMs?: number
}

const DEFAULT_TAU_MS = 36

function LiveDmxSliderCursor({
  universe,
  channelIndex,
  radius,
  orientation,
  color = '#fffa',
  tauMs = DEFAULT_TAU_MS,
}: Props) {
  const output = useDmxMixerChannelOutput(universe, channelIndex)
  const targetRef = useRef(output / 255)
  targetRef.current = output / 255

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
      apply: (value) => {
        const percent = value * 100
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
    wakeSmoothedMotionLoop()
  }, [output])

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

export default memo(LiveDmxSliderCursor)
