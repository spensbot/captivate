import styled, { keyframes } from 'styled-components'
import zIndexes from '../zIndexes'
import OverlayPortal from './OverlayPortal'

interface Props {
  open: boolean
  title: string
  message?: string
  progress?: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export default function BusyModal({ open, title, message, progress }: Props) {
  if (!open) {
    return null
  }

  const hasProgress = Number.isFinite(progress)
  const progressNorm = hasProgress ? clamp01(progress as number) : 0

  return (
    <OverlayPortal>
      <Root>
        <Card>
        <Title>{title}</Title>
        {message !== undefined && message.length > 0 && <Message>{message}</Message>}
        <ProgressTrack>
          {hasProgress ? (
            <ProgressFill style={{ width: `${progressNorm * 100}%` }} />
          ) : (
            <ProgressIndeterminate />
          )}
        </ProgressTrack>
        {hasProgress && <Percent>{Math.round(progressNorm * 100)}%</Percent>}
        </Card>
      </Root>
    </OverlayPortal>
  )
}

const slide = keyframes`
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(105%);
  }
`

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndexes.overlay.busy};
  background: #0008;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
`

const Card = styled.div`
  width: min(28rem, calc(100vw - 2rem));
  border: 1px solid #ffffff26;
  background: #111723;
  border-radius: 0.5rem;
  padding: 0.9rem 1rem;
  box-shadow: 0 0.5rem 2rem #0008;
`

const Title = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: #e8eefc;
`

const Message = styled.div`
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: #b8c6de;
`

const ProgressTrack = styled.div`
  margin-top: 0.6rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #22314a;
  overflow: hidden;
  position: relative;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #5ac8ff, #a9efff);
  transition: width 120ms linear;
`

const ProgressIndeterminate = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 46%;
  border-radius: 999px;
  background: linear-gradient(90deg, #5ac8ff, #a9efff);
  animation: ${slide} 1s linear infinite;
`

const Percent = styled.div`
  margin-top: 0.35rem;
  text-align: right;
  font-size: 0.72rem;
  color: #b8c6de;
`
