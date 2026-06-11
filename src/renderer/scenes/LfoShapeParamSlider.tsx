import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import styled from 'styled-components'
import {
  effectiveLfosAtSplit,
  intermodPropsIncoming,
} from '../../shared/modulation'
import {
  LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM,
  LFO_SHAPE_SLIDER_THUMB_RADIUS_REM,
  LFO_SHAPE_SLIDER_TRACK_WIDTH_REM,
  sliderValueToThumbNorm,
} from '../../shared/lfoShapeSlider'
import { useActiveLightScene } from '../redux/store'
import { useLfoAudioMetrics, useLfoBeats } from '../redux/realtimeSelectors'
import { LfoShapeVerticalRange } from './lfoShapeVerticalRange'

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
    skew: 'skew',
    sinePeakWidth: 'sinePeakWidth',
    rampCurve: 'rampCurve',
    squareDuty: 'squareDuty',
    sawFlatten: 'sawFlatten',
    noiseSeed: 'noiseSeed',
    noiseSmoothing: 'noiseSmoothing',
  }
  return map[id] ?? id
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
  centerDetent: boolean
}

type RailBox = {
  width: number
  height: number
}

/** Matches painted bounds of the rotated range input (post-transform). */
const IntermodRailHost = styled.div<{ $w: number; $h: number }>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${(p) => p.$w}px;
  height: ${(p) => p.$h}px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
`

const IntermodRailTrack = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: ${LFO_SHAPE_SLIDER_TRACK_WIDTH_REM}rem;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(to top, #5a5a5a, #9e9e9e);
`

const IntermodThumb = styled.div<{ $norm: number; $variant: 'live' | 'stored' }>`
  position: absolute;
  left: 50%;
  top: calc(
    ${LFO_SHAPE_SLIDER_THUMB_RADIUS_REM}rem +
      (1 - ${(p) => p.$norm}) * (100% - ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem)
  );
  box-sizing: border-box;
  width: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
  height: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.55);
  background: ${(p) =>
    p.$variant === 'live' ? 'rgba(52, 211, 153, 0.95)' : '#ffd896'};
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  z-index: ${(p) => (p.$variant === 'live' ? 1 : 2)};
`

export default function LfoShapeParamSlider({
  modIndex,
  splitIndex,
  spec,
  centerDetent: _centerDetent,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [railBox, setRailBox] = useState<RailBox | null>(null)

  const lightScene = useActiveLightScene((s) => s)
  const beats = useLfoBeats()
  const audio = useLfoAudioMetrics()

  const intermodProp = shapeSliderIdToInterModProp(spec.id)
  const hasIncoming = useActiveLightScene((scene) => {
    const m = intermodPropsIncoming(scene)
    return m.get(modIndex)?.has(intermodProp) === true
  })

  const storedNorm = sliderValueToThumbNorm(spec.value, spec.min, spec.max)

  const liveNorm = useMemo(() => {
    if (!hasIncoming) {
      return storedNorm
    }
    const lfos = effectiveLfosAtSplit(
      lightScene,
      splitIndex,
      beats,
      audio
    )
    const eff = lfos[modIndex]
    const raw =
      eff !== undefined
        ? Number((eff as unknown as Record<string, number>)[intermodProp])
        : spec.value
    return sliderValueToThumbNorm(raw, spec.min, spec.max)
  }, [
    hasIncoming,
    lightScene,
    splitIndex,
    beats,
    audio,
    modIndex,
    intermodProp,
    spec.value,
    spec.min,
    spec.max,
    storedNorm,
  ])

  useLayoutEffect(() => {
    if (!hasIncoming) {
      setRailBox(null)
      return
    }
    const el = inputRef.current
    if (el === null) {
      return
    }

    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) {
        return
      }
      setRailBox({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [hasIncoming, spec.id, spec.min, spec.max])

  const rangeProps = {
    ref: inputRef,
    type: 'range' as const,
    min: spec.min,
    max: spec.max,
    step: spec.step,
    value: spec.value,
    title: spec.title,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      spec.onChange(Number(event.target.value) || 0),
  }

  if (!hasIncoming) {
    return <LfoShapeVerticalRange {...rangeProps} />
  }

  return (
    <>
      {railBox !== null ? (
        <IntermodRailHost $w={railBox.width} $h={railBox.height}>
          <IntermodRailTrack />
          <IntermodThumb
            $variant="live"
            $norm={liveNorm}
            title="Live value while other effects are running"
          />
          <IntermodThumb
            $variant="stored"
            $norm={storedNorm}
            title={spec.title}
          />
        </IntermodRailHost>
      ) : null}
      <LfoShapeVerticalRange {...rangeProps} $ghost />
    </>
  )
}
