import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

const HOLD_SECONDS = 8

type Props = {
  armed: boolean
  onSetArmed: (next: boolean) => void
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

export default function LaserArmHoldButton({ armed, onSetArmed }: Props) {
  const [pressing, setPressing] = useState(false)
  const [remaining, setRemaining] = useState(HOLD_SECONDS)
  const [activeDot, setActiveDot] = useState(0)
  const [bar01, setBar01] = useState(0)
  const startMs = useRef(0)
  const raf = useRef(0)
  const pressingRef = useRef(false)

  const stopTick = useCallback(() => {
    pressingRef.current = false
    setPressing(false)
    setRemaining(HOLD_SECONDS)
    setActiveDot(0)
    setBar01(0)
    if (raf.current) {
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [])

  const tick = useCallback(() => {
    if (!pressingRef.current) return
    const t = (performance.now() - startMs.current) / 1000
    setBar01(Math.min(1, t / HOLD_SECONDS))
    setRemaining(Math.max(0, Math.ceil(HOLD_SECONDS - t - 1e-6)))
    setActiveDot(Math.min(HOLD_SECONDS, Math.floor(t) + 1))
    if (t >= HOLD_SECONDS) {
      onSetArmed(true)
      stopTick()
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [onSetArmed, stopTick])

  const onPointerDown = (ev: React.PointerEvent) => {
    if (armed) {
      onSetArmed(false)
      return
    }
    ev.preventDefault()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    pressingRef.current = true
    setPressing(true)
    startMs.current = performance.now()
    setRemaining(HOLD_SECONDS)
    setActiveDot(0)
    setBar01(0)
    raf.current = requestAnimationFrame(tick)
  }

  const onPointerEnd = (ev: React.PointerEvent) => {
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
    if (!pressingRef.current) return
    const t = (performance.now() - startMs.current) / 1000
    if (t < HOLD_SECONDS) {
      stopTick()
    }
  }

  useEffect(() => () => stopTick(), [stopTick])

  return (
    <ArmRoot
      type="button"
      $armed={armed}
      $pressing={pressing}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={(ev) => {
        if (pressingRef.current) onPointerEnd(ev)
      }}
      aria-pressed={armed}
      aria-label={armed ? 'Push to stop laser output' : 'Hold to arm laser output'}
    >
      {!armed ? (
        <RingRow>
          {Array.from({ length: HOLD_SECONDS }, (_, i) => {
            const dot = i + 1
            const spinActive = pressing && activeDot === dot
            return <SpinDot key={dot} $active={spinActive} />
          })}
        </RingRow>
      ) : null}
      <CenterBlock>
        {armed ? (
          <StopTitle>PUSH TO STOP</StopTitle>
        ) : pressing ? (
          <>
            <CountNum>{remaining}</CountNum>
            <CountHint>seconds left</CountHint>
          </>
        ) : (
          <>
            <CenterTitle>HOLD TO ARM OUTPUT</CenterTitle>
            <SubHint>{HOLD_SECONDS}s required</SubHint>
          </>
        )}
      </CenterBlock>
      {pressing && !armed ? (
        <ProgressTrack>
          <ProgressFill style={{ width: `${bar01 * 100}%` }} />
        </ProgressTrack>
      ) : null}
    </ArmRoot>
  )
}

const ArmRoot = styled.button<{ $armed: boolean; $pressing: boolean }>`
  position: relative;
  width: 100%;
  min-height: 5.5rem;
  border-radius: 0.55rem;
  border: 2px solid
    ${(p) =>
      p.$armed ? '#ff4d4d' : p.$pressing ? '#e0a030' : '#2a8f5a'};
  background: ${(p) =>
    p.$armed
      ? 'linear-gradient(180deg, #6a2020, #2a0c0c)'
      : p.$pressing
        ? 'linear-gradient(180deg, #3a3018, #1e180c)'
        : 'linear-gradient(180deg, #1e4a2e, #0f2a18)'};
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem 0.65rem;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;
`

const RingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  flex-wrap: wrap;
`

const SpinDot = styled.span<{ $active: boolean }>`
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  border: 2px solid ${(p) => (p.$active ? '#ffd080' : 'rgba(255, 255, 255, 0.35)')};
  background: ${(p) => (p.$active ? 'rgba(255, 200, 120, 0.35)' : 'transparent')};
  animation: ${(p) => (p.$active ? spin : 'none')} 0.85s linear infinite;
  flex-shrink: 0;
`

const CenterBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.08rem;
  min-height: 2.4rem;
`

const CenterTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-align: center;
  line-height: 1.25;
  color: #d8ffe8;
`

const StopTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-align: center;
  line-height: 1.2;
  color: #ffffff;
  text-shadow: 0 0 12px rgba(255, 80, 80, 0.9);
`

const SubHint = styled.div`
  font-size: 0.66rem;
  color: rgba(220, 255, 235, 0.75);
`

const CountNum = styled.div`
  font-size: 1.65rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #ffd896;
`

const CountHint = styled.div`
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.75);
`

const ProgressTrack = styled.div`
  position: absolute;
  left: 0.55rem;
  right: 0.55rem;
  bottom: 0.45rem;
  height: 0.22rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c9a030, #ffd896);
  transition: width 0.04s linear;
`
