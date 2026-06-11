import styled from 'styled-components'
import { Button } from '@mui/material'
import {
  FIXTURE_CHANNEL_TEMPLATES,
  FixtureChannelTemplateId,
} from '../../shared/fixtureWizardHelpers'

type Props = {
  activeTemplateId: FixtureChannelTemplateId | null
  onSelect: (templateId: FixtureChannelTemplateId) => void
}

export default function FixtureChannelTemplatePicker({
  activeTemplateId,
  onSelect,
}: Props) {
  return (
    <Root>
      <PickerTitle>Quick channel layout</PickerTitle>
      <PickerHint>
        Pick a starting layout. You can still add, remove, or edit channels below.
      </PickerHint>
      <TemplateGrid>
        {FIXTURE_CHANNEL_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} $active={activeTemplateId === template.id}>
            <TemplateLabel>{template.label}</TemplateLabel>
            <TemplateDescription>{template.description}</TemplateDescription>
            <Button
              type="button"
              size="small"
              variant={activeTemplateId === template.id ? 'contained' : 'outlined'}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(template.id)
              }}
            >
              {activeTemplateId === template.id ? 'Selected' : 'Use layout'}
            </Button>
          </TemplateCard>
        ))}
      </TemplateGrid>
    </Root>
  )
}

const Root = styled.div`
  margin-bottom: 0.75rem;
`

const PickerTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
  color: #d8e8ff;
`

const PickerHint = styled.div`
  font-size: 0.75rem;
  color: #9eb8d8;
  margin-bottom: 0.5rem;
  line-height: 1.35;
`

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.45rem;
`

const TemplateCard = styled.div<{ $active: boolean }>`
  border: 1px solid
    ${(p) => (p.$active ? '#8eb8ff' : '#4a6ea866')};
  border-radius: 0.35rem;
  padding: 0.45rem 0.5rem;
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, #2f4f82 0%, #243a66 100%)'
      : 'linear-gradient(180deg, #1e2a3c 0%, #161f2c 100%)'};
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  box-shadow: ${(p) => (p.$active ? '0 0 0.5rem #4a7fd644' : 'none')};
`

const TemplateLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
`

const TemplateDescription = styled.div`
  font-size: 0.7rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.3;
  flex: 1 1 auto;
`
