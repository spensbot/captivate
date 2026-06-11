import {
  WEBGL1_FALLBACK_BANNER_TITLE,
  WEBGL1_FALLBACK_DIFFERENCES,
  WEBGL1_FALLBACK_RECOVERY_HINT,
  persistWebgl1BannerDismissed,
} from './webglFallback'
import styled from 'styled-components'

type Props = {
  onDismiss: () => void
}

export default function WebglFallbackBanner({ onDismiss }: Props) {
  const handleDismiss = () => {
    persistWebgl1BannerDismissed()
    onDismiss()
  }

  return (
    <Banner role="status" aria-live="polite">
      <BannerHeader>
        <BannerTitle>{WEBGL1_FALLBACK_BANNER_TITLE}</BannerTitle>
        <DismissButton type="button" onClick={handleDismiss} title="Dismiss this notice">
          Dismiss
        </DismissButton>
      </BannerHeader>
      <BannerIntro>
        Your graphics driver is using the older WebGL 1 path. The preview still runs, but
        some effects are turned off:
      </BannerIntro>
      <DifferenceList>
        {WEBGL1_FALLBACK_DIFFERENCES.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong> — {item.detail}
          </li>
        ))}
      </DifferenceList>
      <RecoveryHint>{WEBGL1_FALLBACK_RECOVERY_HINT}</RecoveryHint>
    </Banner>
  )
}

const Banner = styled.div`
  position: absolute;
  left: 0.45rem;
  right: 0.45rem;
  bottom: 0.45rem;
  z-index: 4;
  max-height: min(42vh, 14rem);
  overflow: auto;
  padding: 0.55rem 0.65rem;
  border-radius: 0.35rem;
  border: 1px solid #c9a22799;
  background: #1a1608ee;
  color: #f5ecd0;
  font-size: 0.72rem;
  line-height: 1.42;
  box-shadow: 0 4px 18px #0008;
`

const BannerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
`

const BannerTitle = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  color: #ffe9a8;
`

const DismissButton = styled.button`
  flex-shrink: 0;
  border: 1px solid #ffffff44;
  background: #ffffff12;
  color: #f5ecd0;
  border-radius: 0.28rem;
  padding: 0.12rem 0.45rem;
  font-size: 0.68rem;
  cursor: pointer;

  &:hover {
    background: #ffffff22;
  }
`

const BannerIntro = styled.p`
  margin: 0 0 0.35rem;
`

const DifferenceList = styled.ul`
  margin: 0 0 0.35rem;
  padding-left: 1.05rem;

  li {
    margin-bottom: 0.22rem;
  }

  strong {
    color: #ffe9a8;
    font-weight: 600;
  }
`

const RecoveryHint = styled.p`
  margin: 0;
  color: #d8ccb0;
  font-size: 0.68rem;
`
