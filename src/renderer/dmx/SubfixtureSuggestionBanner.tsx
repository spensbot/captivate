import styled from 'styled-components'
import { Button } from '@mui/material'
import { SubfixtureSegmentSuggestion } from '../../shared/fixtureWizardHelpers'

type Props = {
  suggestion: SubfixtureSegmentSuggestion
  onApply: () => void
  onDismiss: () => void
}

export default function SubfixtureSuggestionBanner({
  suggestion,
  onApply,
  onDismiss,
}: Props) {
  return (
    <Banner>
      <BannerText>{suggestion.message}</BannerText>
      <BannerActions>
        <Button size="small" variant="contained" onClick={onApply}>
          Apply suggested segments
        </Button>
        <Button size="small" variant="text" onClick={onDismiss}>
          Not now
        </Button>
      </BannerActions>
    </Banner>
  )
}

const Banner = styled.div`
  border: 1px solid #6a96ff55;
  border-radius: 0.35rem;
  background: #2a4a8a18;
  padding: 0.55rem 0.6rem;
  margin-bottom: 0.65rem;
`

const BannerText = styled.div`
  font-size: 0.78rem;
  line-height: 1.4;
  margin-bottom: 0.45rem;
  color: ${(p) => p.theme.colors.text.primary};
`

const BannerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`
