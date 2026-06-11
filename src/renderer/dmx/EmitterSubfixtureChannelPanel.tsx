import styled from 'styled-components'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import {
  FixtureChannel,
  FixtureEmitterDefinition,
  FixtureType,
  subFixtureLabel,
} from '../../shared/dmxFixtures'
import {
  channelActiveForSelection,
  channelListRowBackground,
  channelsForSubFixture,
  EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS,
  type SelectionSubFixtureState,
} from './fixtureEmitterLayoutEditorTools'

type Props = {
  fixtureType: FixtureType
  emitters: FixtureEmitterDefinition[]
  selectedIds: ReadonlySet<string>
  selectionCount: number
  multiSelected: boolean
  subFixtureState: SelectionSubFixtureState
  channelLabel: (channel: FixtureChannel, channelIndex: number) => string
  onAssignSubFixture: (subIndex: number) => void
  onToggleChannel: (channelIndex: number) => void
  onClearChannels: () => void
}

export default function EmitterSubfixtureChannelPanel({
  fixtureType,
  emitters,
  selectedIds,
  selectionCount,
  multiSelected,
  subFixtureState,
  channelLabel,
  onAssignSubFixture,
  onToggleChannel,
  onClearChannels,
}: Props) {
  const hasSubFixtures = fixtureType.subFixtures.length > 0

  if (!hasSubFixtures) {
    return (
      <PanelRoot>
        <ChannelTitleRow>
          <FieldTitle>Assigned Channels</FieldTitle>
          <ClearChannelsButton
            type="button"
            onClick={onClearChannels}
            title="Clear all assigned channels on selected emitters"
          >
            <ClearAllIcon sx={{ fontSize: '1rem' }} />
            Clear
          </ClearChannelsButton>
        </ChannelTitleRow>
        <ChannelList>
          {fixtureType.channels.map((channel, channelIndex) => {
            const active =
              !multiSelected &&
              channelActiveForSelection(emitters, selectedIds, channelIndex)
            return (
              <ChannelButton
                key={channelIndex}
                type="button"
                $active={active}
                $rowBg={channelListRowBackground(fixtureType, channelIndex)}
                onClick={() => onToggleChannel(channelIndex)}
              >
                {channelLabel(channel, channelIndex)}
              </ChannelButton>
            )
          })}
        </ChannelList>
      </PanelRoot>
    )
  }

  return (
    <PanelRoot>
      <FieldTitle>Subfixture</FieldTitle>
      <SubfixtureList>
        {fixtureType.subFixtures.map((sub, subIndex) => {
          const assigned =
            subFixtureState.kind === 'assigned' &&
            subFixtureState.subIndex === subIndex
          const rowColor =
            EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS[
              subIndex % EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS.length
            ] ?? EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS[0]
          const name =
            sub.name.trim().length > 0
              ? sub.name.trim()
              : `Subfixture ${subFixtureLabel(subIndex)}`
          return (
            <SubfixtureButton
              key={subIndex}
              type="button"
              $active={assigned}
              $rowBg={rowColor}
              onClick={() => onAssignSubFixture(subIndex)}
              title={`Assign selected emitter(s) to ${name}`}
            >
              <SubfixtureButtonLabel>{name}</SubfixtureButtonLabel>
              <SubfixtureMeta>
                {sub.channels.length} ch · {subFixtureLabel(subIndex)}
              </SubfixtureMeta>
            </SubfixtureButton>
          )
        })}
      </SubfixtureList>

      {subFixtureState.kind === 'mixed' && (
        <SubText>
          Selected emitters use different subfixtures. Pick one subfixture above to
          reassign them all, then choose channels.
        </SubText>
      )}

      {subFixtureState.kind === 'none' && selectionCount > 0 && (
        <SubText>
          Assign a subfixture above, then enable channels for the selected emitter
          {selectionCount > 1 ? 's' : ''}.
        </SubText>
      )}

      {subFixtureState.kind === 'assigned' && (
        <ChannelsSection>
          <ChannelTitleRow>
            <FieldTitle>Channels in subfixture</FieldTitle>
            <ClearChannelsButton
              type="button"
              onClick={onClearChannels}
              title="Clear channel assignments on selected emitters"
            >
              <ClearAllIcon sx={{ fontSize: '1rem' }} />
              Clear
            </ClearChannelsButton>
          </ChannelTitleRow>
          {multiSelected && (
            <SubText>
              Checkmarks are hidden while multiple emitters are selected. Toggling a
              channel updates every selected emitter in this subfixture.
            </SubText>
          )}
          <ChannelList>
            {channelsForSubFixture(fixtureType, subFixtureState.subIndex).map(
              (channelIndex) => {
                const channel = fixtureType.channels[channelIndex]
                if (channel === undefined) {
                  return null
                }
                const active =
                  !multiSelected &&
                  channelActiveForSelection(emitters, selectedIds, channelIndex)
                return (
                  <ChannelButton
                    key={channelIndex}
                    type="button"
                    $active={active}
                    $rowBg={channelListRowBackground(fixtureType, channelIndex)}
                    onClick={() => onToggleChannel(channelIndex)}
                  >
                    {channelLabel(channel, channelIndex)}
                  </ChannelButton>
                )
              }
            )}
          </ChannelList>
          {channelsForSubFixture(fixtureType, subFixtureState.subIndex).length ===
            0 && (
            <SubText>This subfixture has no channels defined yet.</SubText>
          )}
        </ChannelsSection>
      )}
    </PanelRoot>
  )
}

const PanelRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 0;
  flex: 1 1 auto;
`

const FieldTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
`

const SubText = styled.div`
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const SubfixtureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  max-height: min(11rem, 28dvh);
  overflow-y: auto;
  flex-shrink: 0;
  padding-right: 0.1rem;
`

const ChannelsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
`

const SubfixtureButton = styled.button<{ $active: boolean; $rowBg: string }>`
  text-align: left;
  border: 1px solid
    ${(props) => (props.$active ? '#4c8bff' : props.theme.colors.divider)};
  background: ${(props) =>
    props.$active
      ? `linear-gradient(${props.$rowBg}, ${props.$rowBg}), #1d3f77`
      : props.$rowBg};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.25rem;
  padding: 0.3rem 0.4rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`

const SubfixtureButtonLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
`

const SubfixtureMeta = styled.span`
  font-size: 0.7rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ChannelTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.15rem;
`

const ClearChannelsButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.secondary};
  border-radius: 0.25rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.72rem;
  cursor: pointer;
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
    border-color: #6fb0ff;
  }
`

const ChannelList = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.3rem;
  flex: 1 1 auto;
  min-height: 5rem;
  max-height: min(14rem, 32dvh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const ChannelButton = styled.button<{ $active: boolean; $rowBg: string }>`
  text-align: left;
  border: 1px solid ${(props) => (props.$active ? '#4c8bff' : props.theme.colors.divider)};
  background: ${(props) =>
    props.$active ? '#1d3f77' : props.$rowBg};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.25rem;
  padding: 0.22rem 0.35rem;
  font-size: 0.74rem;
  cursor: pointer;
`
