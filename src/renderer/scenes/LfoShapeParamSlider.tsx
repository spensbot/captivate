import type { ReactNode } from 'react'
import { useMemo } from 'react'
import styled from 'styled-components'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import {
  effectiveLfosAtSplit,
  intermodPropsIncoming,
} from '../../shared/modulation'
import { useActiveLightScene } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'

function shapeSliderIdToInterModProp(id: string): string {
  const map: Record<string, string> = {
    low: 'audioBandLowHz',
    high: 'audioBandHighHz',
    attack: 'audioAttack',
    decay: 'audioDecay',
    bandSmoothing: 'audioBandSmoothing',
    threshold: 'audioThreshold',
    max: 'audioMax',
    smoothing: 'audioEnergySmoothing',
    sinePeakWidth: 'sinePeakWidth',
    rampCurve: 'rampCurve',
    squareDuty: 'squareDuty',
    sawFlatten: 'sawFlatten',
    noiseSeed: 'noiseSeed',
  }
  return map[id] ?? id
}

function clamp01n(v: number) {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function toNorm(value: number, min: number, max: number) {
  if (max <= min) return 0.5
  return clamp01n((value - min) / (max - min))
}

function applyCenterDetent01(value: number) {
  const clamped = clamp01n(Number(value) || 0)
  return Math.abs(clamped - 0.5) <= 0.03 ? 0.5 : clamped
}

type Spec = {
  id: string
  min: number
  max: number
  step: number
  value: number
  title: string
  centerDetent?: boolean
  onChange: (value: number) => void
}

type Props = {
  modIndex: number
  splitIndex: number
  spec: Spec
  nativeSlider: ReactNode
  centerDetent: boolean
}

export default function LfoShapeParamSlider({
  modIndex,
  splitIndex,
  spec,
  nativeSlider,
  centerDetent,
}: Props) {
  const lightScene = useActiveLightScene((s) => s)
  const time = useRealtimeSelector((s) => s.time)
  const audio = useRealtimeSelector((s) => s.audio)

  const intermodProp = shapeSliderIdToInterModProp(spec.id)
  const hasIncoming = useActiveLightScene((scene) => {
    const m = intermodPropsIncoming(scene, splitIndex)
    return m.get(modIndex)?.has(intermodProp) === true
  })

  const { manualNorm, liveNorm } = useMemo(() => {
    const manualNorm = toNorm(spec.value, spec.min, spec.max)
    if (!hasIncoming) {
      return { manualNorm, liveNorm: manualNorm }
    }
    const lfos = effectiveLfosAtSplit(
      lightScene,
      splitIndex,
      time.beats,
      audio
    )
    const eff = lfos[modIndex]
    const raw =
      eff !== undefined
        ? Number((eff as unknown as Record<string, number>)[intermodProp])
        : spec.value
    const liveNorm = toNorm(raw, spec.min, spec.max)
    return { manualNorm, liveNorm }
  }, [
    hasIncoming,
    lightScene,
    splitIndex,
    time.beats,
    audio,
    modIndex,
    intermodProp,
    spec.value,
    spec.min,
    spec.max,
  ])

  if (!hasIncoming) {
    return <>{nativeSlider}</>
  }

  const radius = 0.18

  return (
    <DualShell $centerDetent={centerDetent}>
      <SliderBase
        orientation="vertical"
        radius={radius}
        verticalPadRem={0.08}
        title={spec.title}
        onChange={(y) => {
          let v = spec.min + y * (spec.max - spec.min)
          if (centerDetent && spec.min === 0 && spec.max === 1) {
            v = applyCenterDetent01(v)
          }
          spec.onChange(v)
        }}
      >
        <SliderCursor
          orientation="vertical"
          value={liveNorm}
          radius={radius}
          color="#7eb8ffcc"
          pointerEvents="none"
        />
        <SliderCursor
          orientation="vertical"
          value={manualNorm}
          radius={radius}
          color="#fff"
          border
          pointerEvents="none"
        />
      </SliderBase>
    </DualShell>
  )
}

const DualShell = styled.div<{ $centerDetent: boolean }>`
  position: relative;
  width: 0.92rem;
  min-height: 0;
  flex: 1 1 auto;
  align-self: stretch;
  height: 100%;
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    display: ${(p) => (p.$centerDetent ? 'block' : 'none')};
    position: absolute;
    left: 0.08rem;
    right: 0.08rem;
    top: 50%;
    height: 1px;
    background: rgba(255, 216, 150, 0.9);
    pointer-events: none;
    z-index: 1;
  }
`
