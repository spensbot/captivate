import styled from 'styled-components'
import zIndexes from '../zIndexes'
import OverlayPortal from './OverlayPortal'

const wizardZ = zIndexes.overlay.wizard

export type WizardStepDef = {
  key: string
  title: string
  description: string
  /** Optional help link rendered under the step description (e.g. wiki). */
  help?: React.ReactNode
}

interface Props {
  open: boolean
  title: string
  steps: WizardStepDef[]
  stepIndex: number
  onClose: () => void
  onBack: () => void
  onNext: () => void
  onSave: () => void
  children: React.ReactNode
  saveLabel?: string
  maxWidth?: string
  minHeight?: string
  /** Shown above the action buttons on the last step (e.g. post-save options). */
  footerSlot?: React.ReactNode
}

export default function WizardModal({
  open,
  title,
  steps,
  stepIndex,
  onClose,
  onBack,
  onNext,
  onSave,
  children,
  saveLabel = 'Save',
  maxWidth = 'min(42rem, calc(100vw - 2rem))',
  minHeight = 'min(28rem, calc(100dvh - 6rem))',
  footerSlot,
}: Props) {
  if (!open) {
    return null
  }

  const isFirst = stepIndex <= 0
  const isLast = stepIndex >= steps.length - 1
  const step = steps[stepIndex]

  return (
    <OverlayPortal>
      <Root
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
      >
      <Card $maxWidth={maxWidth} $minHeight={minHeight}>
        <Title>{title}</Title>
        <StepRail>
          {steps.map((s, index) => (
            <StepChip
              key={s.key}
              $active={index === stepIndex}
              $done={index < stepIndex}
            >
              {index + 1}. {s.title}
            </StepChip>
          ))}
        </StepRail>
        <StepHeading>{step.title}</StepHeading>
        <StepDescription>{step.description}</StepDescription>
        {step.help !== undefined && step.help !== null && (
          <StepHelp>{step.help}</StepHelp>
        )}
        <Body>{children}</Body>
        {isLast && footerSlot !== undefined && footerSlot !== null && (
          <FooterSlot>{footerSlot}</FooterSlot>
        )}
        <Actions>
          <ActionButton type="button" onClick={onClose}>
            Cancel
          </ActionButton>
          <Spacer />
          {!isFirst && (
            <ActionButton type="button" onClick={onBack}>
              Back
            </ActionButton>
          )}
          {isLast ? (
            <ActionButton type="button" $primary onClick={onSave}>
              {saveLabel}
            </ActionButton>
          ) : (
            <ActionButton type="button" $primary onClick={onNext}>
              Next
            </ActionButton>
          )}
        </Actions>
      </Card>
      </Root>
    </OverlayPortal>
  )
}

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${wizardZ};
  background: #000c;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`

const Card = styled.div<{ $maxWidth: string; $minHeight: string }>`
  width: ${(p) => p.$maxWidth};
  min-height: ${(p) => p.$minHeight};
  max-height: calc(100dvh - 2rem);
  overflow: hidden;
  border: 1px solid #5b8fd6aa;
  border-radius: 0.5rem;
  background: linear-gradient(165deg, #1e2a3e 0%, #141c28 48%, #101620 100%);
  box-shadow:
    0 0.6rem 2.1rem #000a,
    0 0 0 1px #6a9ee622 inset;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  box-sizing: border-box;
`

const Title = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: #e4efff;
`

const StepRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const StepChip = styled.div<{ $active: boolean; $done: boolean }>`
  font-size: 0.68rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid
    ${(p) =>
      p.$active ? '#8eb8ff' : p.$done ? '#5a8fd6aa' : '#3d4f6688'};
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, #3a5f9e 0%, #2a4a7a 100%)'
      : p.$done
        ? '#2a4a7a44'
        : '#1a2433'};
  color: ${(p) =>
    p.$active ? '#f0f6ff' : p.$done ? '#c5dcff' : '#9eb0c8'};
  font-weight: ${(p) => (p.$active ? 700 : 500)};
`

const StepHeading = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #dceaff;
`

const StepDescription = styled.div`
  font-size: 0.8rem;
  color: #a8bdd8;
  line-height: 1.35;
`

const StepHelp = styled.div`
  flex-shrink: 0;
`

const FooterSlot = styled.div`
  flex-shrink: 0;
  padding: 0.15rem 0 0.25rem;
`

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.45rem 0.5rem;
  margin: 0 -0.15rem;
  border-radius: 0.35rem;
  background: #0f1520cc;
  border: 1px solid #3d527066;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
  padding-top: 0.35rem;
`

const Spacer = styled.div`
  flex: 1 1 auto;
`

const ActionButton = styled.button<{ $primary?: boolean }>`
  min-width: 5.5rem;
  border-radius: 0.35rem;
  border: 1px solid ${(p) => (p.$primary ? '#8eb8ff' : '#5a6f8888')};
  background: ${(p) =>
    p.$primary
      ? 'linear-gradient(180deg, #4a7fd6 0%, #2f5aa8 100%)'
      : 'linear-gradient(180deg, #243040 0%, #1a2430 100%)'};
  color: ${(p) => (p.$primary ? '#f4f8ff' : '#c5d4e8')};
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: ${(p) => (p.$primary ? 700 : 500)};
  :not(:disabled):hover {
    filter: brightness(1.08);
  }
`
