import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@mui/material'
import { FixtureType, fixtureModelSummaryLine } from '../../shared/dmxFixtures'
import FixtureModelLayoutWizard from './FixtureModelLayoutWizard'
import { FixtureModelSummaryHelpButton } from './fixtureEditorHelpButtons'

interface Props {
  fixtureType: FixtureType
}

export default function FixtureModelSummary({ fixtureType }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const summary = fixtureModelSummaryLine(fixtureType)

  return (
    <Root>
      <HeaderRow>
        <TitleRow>
          <Title>3D model &amp; emitters</Title>
          <FixtureModelSummaryHelpButton />
        </TitleRow>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setWizardOpen(true)}
          title="Open model & emitter setup wizard"
        >
          Setup…
        </Button>
      </HeaderRow>
      <Hint>
        Optional for live control. Captivate picks sensible defaults so you can
        patch and use your lights without editing the model.
      </Hint>
      <Summary>{summary}</Summary>
      <FixtureModelLayoutWizard
        open={wizardOpen}
        fixtureId={fixtureType.id}
        onClose={() => setWizardOpen(false)}
      />
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(p) => p.theme.colors.bg.darker};
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.55rem 0.6rem;
  min-width: 0;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
`

const Title = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
`

const Hint = styled.div`
  font-size: 0.75rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
  margin-bottom: 0.35rem;
`

const Summary = styled.div`
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.primary};
  opacity: 0.9;
`
