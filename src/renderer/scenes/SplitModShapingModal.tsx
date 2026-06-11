import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { FormControlLabel, Switch } from '@mui/material'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import { setSplitModShaping } from '../redux/controlSlice'
import { useActiveLightScene } from '../redux/store'
import {
  SPLIT_MOD_MAX_STAIR_STEPS,
  type SplitModShaping,
} from '../../shared/modulation'

const PHASE_MIN = -32
const PHASE_MAX = 32
const PHASE_SPAN = PHASE_MAX - PHASE_MIN

const SLIDER_RADIUS = 0.34
const CURSOR_COLOR = '#8eb0ff'

/** Phase: only values shown on the rail (no in-between positions). */
const PHASE_TICK_BEATS: readonly number[] = [
  -32, -16, -8, -4, -2, -1, -0.5, 0, 0.5, 1, 2, 4, 8, 16, 32,
]

/**
 * Quantize: off at the left, then only these level counts (ticks). Max matches engine cap.
 */
const QUANT_TICK_STEPS: readonly number[] = [0, 2, 4, 8, 16, 32]

function quantTickNorm(steps: number): number {
  if (steps < 2) return 0
  return Math.max(0, Math.min(1, steps / SPLIT_MOD_MAX_STAIR_STEPS))
}

function nearestQuantStepsFromStore(steps: number): number {
  if (!Number.isFinite(steps) || steps < 2) return 0
  const clamped = Math.min(SPLIT_MOD_MAX_STAIR_STEPS, Math.round(steps))
  if (clamped < 2) return 0
  let best = 2
  let bestD = Math.abs(clamped - 2)
  for (const t of QUANT_TICK_STEPS) {
    if (t < 2) continue
    const d = Math.abs(clamped - t)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

function phaseToNorm(beats: number): number {
  if (!Number.isFinite(beats)) return 0.5
  return Math.max(0, Math.min(1, (beats - PHASE_MIN) / PHASE_SPAN))
}

function normToPhase(norm: number): number {
  return norm * PHASE_SPAN + PHASE_MIN
}

function snapPhaseBeats(beats: number): number {
  if (!Number.isFinite(beats)) return 0
  const b = Math.max(PHASE_MIN, Math.min(PHASE_MAX, beats))
  let best = PHASE_TICK_BEATS[0]!
  let bestD = Math.abs(b - best)
  for (const t of PHASE_TICK_BEATS) {
    const d = Math.abs(b - t)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

function stepsToNorm(steps: number): number {
  return quantTickNorm(steps)
}

function normToSteps(norm: number): number {
  const n = Math.max(0, Math.min(1, norm))
  let best: (typeof QUANT_TICK_STEPS)[number] = 0
  let bestD = Math.abs(n - quantTickNorm(0))
  for (const t of QUANT_TICK_STEPS) {
    const d = Math.abs(n - quantTickNorm(t))
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

function formatPhase(beats: number): string {
  if (!Number.isFinite(beats)) return '0'
  const rounded = Math.round(beats * 1000) / 1000
  if (rounded === 0) return '0'
  const s = String(rounded)
  return rounded > 0 ? `+${s}` : s
}

function phaseTickHeightPx(b: number): number {
  if (b === 0) return 10
  const a = Math.abs(b)
  if (a >= 8) return 8
  if (a >= 2) return 7
  return 5
}

function quantTickHeightPx(steps: number): number {
  if (steps === 0) return 10
  if (steps >= 16) return 8
  if (steps >= 8) return 7
  return 6
}

export default function SplitModShapingModal({
  splitIndex,
  onClose,
}: {
  splitIndex: number
  onClose: () => void
}) {
  const dispatch = useDispatch()
  const shapingFromStore = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.splitModShaping
  )

  const [invert, setInvert] = useState(false)
  const [phaseBeats, setPhaseBeats] = useState(0)
  const [stairSteps, setStairSteps] = useState(0)

  useEffect(() => {
    const s = shapingFromStore
    setInvert(s?.invertModulation === true)
    setPhaseBeats(
      snapPhaseBeats(
        Number.isFinite(s?.phaseOffsetBeats) ? Number(s!.phaseOffsetBeats) : 0
      )
    )
    setStairSteps(
      s?.modulationStairSteps !== undefined && s.modulationStairSteps >= 2
        ? nearestQuantStepsFromStore(s.modulationStairSteps)
        : 0
    )
  }, [shapingFromStore])

  function apply() {
    const shaping: SplitModShaping = {}
    if (invert) shaping.invertModulation = true
    if (phaseBeats !== 0 && Number.isFinite(phaseBeats)) {
      shaping.phaseOffsetBeats = phaseBeats
    }
    if (stairSteps >= 2 && Number.isFinite(stairSteps)) {
      shaping.modulationStairSteps = Math.min(
        SPLIT_MOD_MAX_STAIR_STEPS,
        Math.round(stairSteps)
      )
    }
    dispatch(
      setSplitModShaping({
        splitIndex,
        shaping: Object.keys(shaping).length > 0 ? shaping : undefined,
      })
    )
    onClose()
  }

  function clear() {
    dispatch(setSplitModShaping({ splitIndex, shaping: undefined }))
    onClose()
  }

  const quantLabel =
    stairSteps >= 2 ? `${stairSteps} levels` : 'Off (smooth)'

  return (
    <ModalBody>
      <FieldRow>
        <FormControlLabel
          sx={{ marginLeft: 0, marginRight: 0, gap: 0.65, alignItems: 'center' }}
          control={
            <Switch
              size="small"
              checked={invert}
              onChange={(_, checked) => setInvert(checked)}
              inputProps={{ 'aria-label': 'Invert modulation' }}
            />
          }
          label={<ToggleLabel>Invert modulation</ToggleLabel>}
        />
      </FieldRow>
      <FieldRow>
        <SliderRowHeader>
          <SliderLabel title="Shift later (right) or earlier (left) on the beat">
            Phase offset (beats)
          </SliderLabel>
          <ValueReadout>{formatPhase(phaseBeats)}</ValueReadout>
        </SliderRowHeader>
        <SliderTrackWrap>
          <TickMarksLayer aria-hidden>
            {PHASE_TICK_BEATS.map((b) => (
              <TickMark
                key={b}
                $px={phaseTickHeightPx(b)}
                $strong={b === 0}
                style={{ left: `${phaseToNorm(b) * 100}%` }}
              />
            ))}
          </TickMarksLayer>
          <SliderStack>
            <SliderBase
              orientation="horizontal"
              radius={SLIDER_RADIUS}
              title="Phase offset in beats"
              ariaLabel="Phase offset in beats"
              onChange={(norm) =>
                setPhaseBeats(snapPhaseBeats(normToPhase(norm)))
              }
            >
              <SliderCursor
                orientation="horizontal"
                value={phaseToNorm(phaseBeats)}
                radius={SLIDER_RADIUS}
                color={CURSOR_COLOR}
                border
              />
            </SliderBase>
          </SliderStack>
        </SliderTrackWrap>
      </FieldRow>
      <FieldRow>
        <SliderRowHeader>
          <SliderLabel title="2 or more makes the wave step in chunks; all the way left is smooth">
            Quantize (stair-step)
          </SliderLabel>
          <ValueReadout>{quantLabel}</ValueReadout>
        </SliderRowHeader>
        <SliderTrackWrap>
          <TickMarksLayer aria-hidden>
            {QUANT_TICK_STEPS.map((steps) => (
              <TickMark
                key={steps}
                $px={quantTickHeightPx(steps)}
                $strong={steps === 0}
                style={{
                  left: `${quantTickNorm(steps) * 100}%`,
                }}
              />
            ))}
          </TickMarksLayer>
          <SliderStack>
            <SliderBase
              orientation="horizontal"
              radius={SLIDER_RADIUS}
              title="Stair-step levels (0 = smooth)"
              ariaLabel="Stair-step levels"
              onChange={(norm) => setStairSteps(normToSteps(norm))}
            >
              <SliderCursor
                orientation="horizontal"
                value={stepsToNorm(stairSteps)}
                radius={SLIDER_RADIUS}
                color={CURSOR_COLOR}
                border
              />
            </SliderBase>
          </SliderStack>
        </SliderTrackWrap>
      </FieldRow>
      <Actions>
        <GhostButton type="button" onClick={clear}>
          Clear all
        </GhostButton>
        <PrimaryButton type="button" onClick={apply}>
          Apply
        </PrimaryButton>
      </Actions>
    </ModalBody>
  )
}

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: min(22rem, 92vw);
  padding: 0.15rem 0.05rem 0;
`

const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`

const ToggleLabel = styled.span`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
  user-select: none;
`

const SliderRowHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
`

const SliderLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.primary};
  user-select: none;
`

const ValueReadout = styled.span`
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${(props) => props.theme.colors.text.secondary};
`

const SliderTrackWrap = styled.div`
  position: relative;
  width: 100%;
  height: 2rem;
  min-height: 2rem;
  display: flex;
  align-items: center;
  box-sizing: border-box;
`

const TickMarksLayer = styled.div`
  position: absolute;
  left: ${SLIDER_RADIUS}rem;
  right: ${SLIDER_RADIUS}rem;
  bottom: 0.06rem;
  height: 0.62rem;
  pointer-events: none;
  z-index: 0;
`

const TickMark = styled.div<{ $px: number; $strong?: boolean }>`
  position: absolute;
  bottom: 0;
  width: ${(p) => (p.$strong ? 2 : 1)}px;
  height: ${(p) => p.$px}px;
  border-radius: 1px;
  background: ${(p) =>
    p.$strong ? 'rgba(255, 216, 150, 0.92)' : 'rgba(165, 185, 220, 0.52)'};
  transform: translateX(-50%);
  box-shadow: ${(p) =>
    p.$strong ? '0 0 0 1px rgba(0, 0, 0, 0.35)' : 'none'};
`

const SliderStack = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-top: 0.35rem;
  padding-top: 0.45rem;
  border-top: 1px solid ${(props) => props.theme.colors.divider};
`

const GhostButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.32rem;
  background: transparent;
  color: ${(props) => props.theme.colors.text.secondary};
  padding: 0.32rem 0.65rem;
  font-size: 0.76rem;
  cursor: pointer;

  &:hover {
    border-color: ${(props) => props.theme.colors.text.secondary};
    color: ${(props) => props.theme.colors.text.primary};
  }
`

const PrimaryButton = styled.button`
  border: 1px solid #6b8cce88;
  border-radius: 0.32rem;
  background: #3357b955;
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.32rem 0.85rem;
  font-size: 0.76rem;
  cursor: pointer;

  &:hover {
    background: #3357b988;
  }
`
