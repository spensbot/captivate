import { useState } from 'react'
import styled from 'styled-components'
import WizardModal, { WizardStepDef } from '../overlays/WizardModal'
import { useDmxSelector } from '../redux/store'
import {
  fixtureModelKindName,
  fixtureModelSummaryLine,
  inferFixtureModelKind,
  normalizeFixtureModelConfig,
  resolvedEmittersForFixtureType,
} from '../../shared/dmxFixtures'
import FixtureModelEditor from './FixtureModelEditor'
import FixtureWizardHelpLink from './FixtureWizardHelpLink'

const STEPS: WizardStepDef[] = [
  {
    key: 'intro',
    title: 'Overview',
    description:
      'This wizard is only for the 3D lighting preview. Your DMX channels and segments are already enough to control the fixture in shows.',
    help: <FixtureWizardHelpLink topic="model-intro" />,
  },
  {
    key: 'model',
    title: 'Model & emitters',
    description:
      'Pick a generic shape (PAR, wash bar, mover, etc.) or keep Auto. Adjust size if the preview looks wrong. Emitter layout is filled in automatically unless you turn on a custom layout.',
    help: <FixtureWizardHelpLink topic="model-settings" />,
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Confirm the preview settings, then save.',
    help: <FixtureWizardHelpLink topic="model-review" />,
  },
]

type Props = {
  open: boolean
  fixtureId: string
  onClose: () => void
}

export default function FixtureModelLayoutWizard({
  open,
  fixtureId,
  onClose,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const fixture = useDmxSelector((state) => state.fixtureTypesByID[fixtureId])

  if (!open || fixture === undefined) {
    return null
  }

  const model = normalizeFixtureModelConfig(fixture.model, fixture)
  const effectiveKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixture) : model.kind
  const emitterCount = resolvedEmittersForFixtureType(fixture).length

  return (
    <WizardModal
      open={open}
      title="3D model & emitter layout"
      steps={STEPS}
      stepIndex={stepIndex}
      onClose={() => {
        setStepIndex(0)
        onClose()
      }}
      onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
      onNext={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
      onSave={() => {
        setStepIndex(0)
        onClose()
      }}
      saveLabel="Save"
      maxWidth="min(46rem, calc(100vw - 2rem))"
      minHeight="min(34rem, calc(100dvh - 5rem))"
    >
      {stepIndex === 0 && (
        <IntroBody>
          <p>
            Most users can skip this entirely. Captivate already places emitters
            based on your channels and segments.
          </p>
          <p>
            Use this wizard when you care about the <strong>3D preview</strong>{' '}
            looking like your real fixture, or when you need a custom emitter
            layout.
          </p>
          <CurrentSummary>{fixtureModelSummaryLine(fixture)}</CurrentSummary>
        </IntroBody>
      )}
      {stepIndex === 1 && (
        <ModelStep>
          <FixtureModelEditor fixtureType={fixture} hideHeader bare />
        </ModelStep>
      )}
      {stepIndex === 2 && (
        <ReviewBody>
          <ReviewRow>
            <strong>Model type</strong>
            <span>{fixtureModelKindName(effectiveKind)}</span>
          </ReviewRow>
          <ReviewRow>
            <strong>Emitters in preview</strong>
            <span>{emitterCount}</span>
          </ReviewRow>
          <ReviewRow>
            <strong>Custom layout</strong>
            <span>{model.useCustomEmitterLayout ? 'Yes' : 'No (automatic)'}</span>
          </ReviewRow>
          <Tip>
            Changes apply to the 3D lighting preview and spatial tools. DMX
            patching is unchanged.
          </Tip>
        </ReviewBody>
      )}
    </WizardModal>
  )
}

const IntroBody = styled.div`
  font-size: 0.82rem;
  line-height: 1.45;
  color: #b8cce6;

  p {
    margin: 0 0 0.65rem;
  }
`

const CurrentSummary = styled.div`
  margin-top: 0.5rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.3rem;
  border: 1px solid #4a6ea888;
  background: linear-gradient(180deg, #243552 0%, #1a283c 100%);
  font-size: 0.78rem;
  color: #e4efff;
`

const ModelStep = styled.div`
  min-width: 0;
`

const ReviewBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.82rem;
`

const ReviewRow = styled.div`
  display: flex;
  gap: 0.5rem;
  strong {
    min-width: 9rem;
  }
`

const Tip = styled.div`
  font-size: 0.75rem;
  color: #8eb0d8;
  margin-top: 0.35rem;
  line-height: 1.35;
  padding: 0.35rem 0.45rem;
  border-radius: 0.28rem;
  border: 1px solid #3d527066;
  background: #1a2433aa;
`
