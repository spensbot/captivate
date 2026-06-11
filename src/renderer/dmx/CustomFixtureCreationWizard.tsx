import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import Input from '../base/Input'
import LabelledCheckbox from '../base/LabelledCheckbox'
import WizardModal, { WizardStepDef } from '../overlays/WizardModal'
import { useDmxSelector } from '../redux/store'
import {
  addFixtureType,
  deleteFixtureType,
  updateFixtureType,
} from '../redux/dmxSlice'
import { FixtureType, subFixtureLabel } from '../../shared/dmxFixtures'
import {
  applyFixtureChannelTemplate,
  applySubfixtureSuggestion,
  FixtureChannelTemplateId,
  initFixtureTypeForCreation,
  readOpenModelWizardAfterCreatePreference,
  suggestSubfixtureSegments,
  writeOpenModelWizardAfterCreatePreference,
} from '../../shared/fixtureWizardHelpers'
import FixtureChannels from './FixtureChannels'
import Subfixtures from './Subfixtures'
import FixtureChannelTemplatePicker from './FixtureChannelTemplatePicker'
import SubfixtureSuggestionBanner from './SubfixtureSuggestionBanner'
import FixtureWizardHelpLink from './FixtureWizardHelpLink'
import { openAppConfirm } from 'renderer/overlays/appDialogService'
import { store } from '../redux/store'

const STEPS: WizardStepDef[] = [
  {
    key: 'basics',
    title: 'Basics',
    description:
      'Give your fixture a name you will recognize on stage. Manufacturer is optional.',
    help: <FixtureWizardHelpLink topic="creation-basics" />,
  },
  {
    key: 'channels',
    title: 'Channels',
    description:
      'List every DMX channel on the fixture in order. Use a quick layout below, or add channels one at a time.',
    help: <FixtureWizardHelpLink topic="creation-channels" />,
  },
  {
    key: 'subfixtures',
    title: 'Segments',
    description:
      'If your fixture has separate heads or pixels (for example a wash bar), add a segment for each. Then assign channels to each segment using the colored markers.',
    help: <FixtureWizardHelpLink topic="creation-segments" />,
  },
  {
    key: 'review',
    title: 'Review',
    description:
      'Check your fixture, then save. You can optionally open the 3D model wizard right after saving.',
    help: <FixtureWizardHelpLink topic="creation-review" />,
  },
]

export type CustomFixtureCreationSaveOptions = {
  openModelWizard: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (fixtureId: string, options: CustomFixtureCreationSaveOptions) => void
}

export default function CustomFixtureCreationWizard({
  open,
  onClose,
  onSaved,
}: Props) {
  const dispatch = useDispatch()
  const [stepIndex, setStepIndex] = useState(0)
  const [draftFixtureId, setDraftFixtureId] = useState<string | null>(null)
  const [activeTemplateId, setActiveTemplateId] =
    useState<FixtureChannelTemplateId | null>('rgb_dimmer')
  const [segmentSuggestionDismissed, setSegmentSuggestionDismissed] =
    useState(false)
  const [openModelWizardAfterSave, setOpenModelWizardAfterSave] = useState(
    readOpenModelWizardAfterCreatePreference
  )
  const createdForSessionRef = useRef(false)

  const fixture = useDmxSelector((state) =>
    draftFixtureId !== null
      ? state.fixtureTypesByID[draftFixtureId]
      : undefined
  )

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      setDraftFixtureId(null)
      setActiveTemplateId('rgb_dimmer')
      setSegmentSuggestionDismissed(false)
      setOpenModelWizardAfterSave(readOpenModelWizardAfterCreatePreference())
      createdForSessionRef.current = false
      return
    }
    if (createdForSessionRef.current) {
      return
    }
    createdForSessionRef.current = true
    const created = initFixtureTypeForCreation()
    dispatch(addFixtureType(created))
    setDraftFixtureId(created.id)
    setStepIndex(0)
  }, [open, dispatch])

  async function handleClose() {
    if (draftFixtureId === null) {
      onClose()
      return
    }
    const discard = await openAppConfirm({
      title: 'Discard new fixture?',
      message:
        'Close the wizard without saving? The unfinished fixture will be removed.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
    })
    if (!discard) {
      return
    }
    dispatch(deleteFixtureType(draftFixtureId))
    onClose()
  }

  function handleSave() {
    writeOpenModelWizardAfterCreatePreference(openModelWizardAfterSave)
    if (draftFixtureId !== null) {
      onSaved?.(draftFixtureId, { openModelWizard: openModelWizardAfterSave })
    }
    onClose()
  }

  function applyTemplate(templateId: FixtureChannelTemplateId) {
    if (draftFixtureId === null) {
      return
    }
    const latest = store.getState().dmx.present.fixtureTypesByID[draftFixtureId]
    if (latest === undefined) {
      return
    }
    setActiveTemplateId(templateId)
    dispatch(
      updateFixtureType(applyFixtureChannelTemplate(latest, templateId))
    )
    setSegmentSuggestionDismissed(false)
  }

  if (!open || fixture === undefined) {
    return null
  }

  const segmentSuggestion =
    !segmentSuggestionDismissed && stepIndex === 2
      ? suggestSubfixtureSegments(fixture)
      : null

  return (
    <WizardModal
      open={open}
      title="Create custom fixture"
      steps={STEPS}
      stepIndex={stepIndex}
      onClose={() => void handleClose()}
      onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
      onNext={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
      onSave={handleSave}
      saveLabel="Save fixture"
      maxWidth="min(44rem, calc(100vw - 2rem))"
      minHeight="min(32rem, calc(100dvh - 5rem))"
      footerSlot={
        <LabelledCheckbox
          label="After saving, open the 3D model & emitter wizard"
          checked={openModelWizardAfterSave}
          onChange={setOpenModelWizardAfterSave}
        />
      }
    >
      {stepIndex === 0 && <BasicsStep fixture={fixture} />}
      {stepIndex === 1 && (
        <ChannelsStep
          fixtureId={fixture.id}
          channelCount={fixture.channels.length}
          activeTemplateId={activeTemplateId}
          onSelectTemplate={applyTemplate}
        />
      )}
      {stepIndex === 2 && (
        <SubfixturesStep
          segmentSuggestion={segmentSuggestion}
          onApplySuggestion={() => {
            if (segmentSuggestion === null) {
              return
            }
            dispatch(
              updateFixtureType(
                applySubfixtureSuggestion(fixture, segmentSuggestion)
              )
            )
            setSegmentSuggestionDismissed(true)
          }}
          onDismissSuggestion={() => setSegmentSuggestionDismissed(true)}
        />
      )}
      {stepIndex === 3 && <ReviewStep fixture={fixture} />}
    </WizardModal>
  )
}

function BasicsStep({ fixture }: { fixture: FixtureType }) {
  const dispatch = useDispatch()
  return (
    <Fields>
      <Input
        value={fixture.name}
        onChange={(name) =>
          dispatch(updateFixtureType({ ...fixture, name: name || 'New Fixture' }))
        }
        placeholder="Fixture name (e.g. Front Wash)"
      />
      <Input
        value={fixture.manufacturer || ''}
        onChange={(manufacturer) =>
          dispatch(updateFixtureType({ ...fixture, manufacturer }))
        }
        placeholder="Manufacturer (optional)"
      />
    </Fields>
  )
}

function ChannelsStep({
  fixtureId,
  channelCount,
  activeTemplateId,
  onSelectTemplate,
}: {
  fixtureId: string
  channelCount: number
  activeTemplateId: FixtureChannelTemplateId | null
  onSelectTemplate: (id: FixtureChannelTemplateId) => void
}) {
  return (
    <>
      <FixtureChannelTemplatePicker
        activeTemplateId={activeTemplateId}
        onSelect={onSelectTemplate}
      />
      <EmbeddedEditor>
        <FixtureChannels fixtureID={fixtureId} isInUse={false} />
        {channelCount === 0 && (
          <Warn>Add at least one channel before continuing.</Warn>
        )}
      </EmbeddedEditor>
    </>
  )
}

function SubfixturesStep({
  segmentSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
}: {
  segmentSuggestion: ReturnType<typeof suggestSubfixtureSegments>
  onApplySuggestion: () => void
  onDismissSuggestion: () => void
}) {
  return (
    <EmbeddedEditor>
      {segmentSuggestion !== null && (
        <SubfixtureSuggestionBanner
          suggestion={segmentSuggestion}
          onApply={onApplySuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}
      <Subfixtures />
      <Tip>
        Single-head fixtures can skip segments — all channels stay on the main
        fixture. Multi-head or pixel fixtures need one segment per zone.
      </Tip>
    </EmbeddedEditor>
  )
}

function ReviewStep({ fixture }: { fixture: FixtureType }) {
  const channelNames = fixture.channels.map((ch, i) => {
    let label: string = ch.type
    if (ch.type === 'master') {
      label = 'Master'
    } else if (ch.type === 'color') {
      label = 'Color'
    } else if (ch.type === 'custom') {
      label = ch.name
    } else if (ch.type === 'split') {
      label = 'Split'
    } else if (ch.type === 'axis') {
      label = ch.dir === 'x' ? 'Pan' : 'Tilt'
    }
    return `${i + 1}. ${label}`
  })
  const segmentLines =
    fixture.subFixtures.length === 0
      ? ['(none — whole fixture is one zone)']
      : fixture.subFixtures.map(
          (sf, i) =>
            `${subFixtureLabel(i)}: ${sf.channels.length} channel${
              sf.channels.length === 1 ? '' : 's'
            }`
        )

  return (
    <Review>
      <ReviewRow>
        <strong>Name</strong>
        <span>{fixture.name}</span>
      </ReviewRow>
      {fixture.manufacturer ? (
        <ReviewRow>
          <strong>Manufacturer</strong>
          <span>{fixture.manufacturer}</span>
        </ReviewRow>
      ) : null}
      <ReviewRow>
        <strong>Channels</strong>
        <span>{fixture.channels.length}</span>
      </ReviewRow>
      <ChannelList>{channelNames.join(' · ')}</ChannelList>
      <ReviewRow>
        <strong>Segments</strong>
        <span>{fixture.subFixtures.length}</span>
      </ReviewRow>
      <ChannelList>{segmentLines.join(' · ')}</ChannelList>
    </Review>
  )
}

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const EmbeddedEditor = styled.div`
  min-width: 0;
`

const Warn = styled.div`
  font-size: 0.78rem;
  color: #ffc98a;
  margin-top: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.28rem;
  border: 1px solid #c98a4044;
  background: #3a2a1844;
`

const Tip = styled.div`
  font-size: 0.75rem;
  color: #9eb8d8;
  margin-top: 0.65rem;
  line-height: 1.35;
  padding: 0.4rem 0.5rem;
  border-radius: 0.28rem;
  border: 1px solid #3d527066;
  background: #1a2433aa;
`

const Review = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
  padding: 0.5rem 0.55rem;
  border-radius: 0.3rem;
  border: 1px solid #4a6ea866;
  background: linear-gradient(180deg, #243552 0%, #1a283c 100%);
  color: #e4efff;
`

const ReviewRow = styled.div`
  display: flex;
  gap: 0.5rem;
  strong {
    min-width: 6.5rem;
  }
`

const ChannelList = styled.div`
  font-size: 0.78rem;
  color: #b8cce6;
  line-height: 1.35;
`
