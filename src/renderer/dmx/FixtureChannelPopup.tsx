import styled from 'styled-components'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Select from '../base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
  ChannelType,
  AxisDir,
  axisDirList,
  axisDirName,
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  nonSplitChannelTypes,
  LeafFixtureChannel,
  SplitChannelRange,
  initChannelSplitFromChannel,
  initSplitChannelRange,
} from '../../shared/dmxFixtures'
import NumberField from '../base/NumberField'
import Input from '../base/Input'
import { editFixtureChannel } from '../redux/dmxSlice'
import { useDmxSelector } from '../redux/store'
import Checkbox from '../base/LabelledCheckbox'
import HSpad, { ColorChannelProps } from 'renderer/base/HSpad'
import { FixtureChannelItemProps } from './FixtureChannelTypes'
import ColorMapChannel from './ColorMapChannel'
import GoboMapChannel from './GoboMapChannel'
import FocusChannel from './FocusChannel'
import PrismMapChannel from './PrismMapChannel'
import ColorPicker from 'renderer/base/ColorPicker'
import { inferColorKind } from '../../shared/dmxColors'
import { approximateStandardColor, colorByName } from '../../shared/dmxColors'

interface Props extends FixtureChannelItemProps {
  ch: FixtureChannel
}

const autoColorSequence = [
  'Red',
  'Green',
  'Blue',
  'White',
  'Amber',
  'UV',
] as const

function clampDmxValue(value: number, fallback: number = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function clampRangeBounds(min: number, max: number): { min: number; max: number } {
  return {
    min: Math.min(clampDmxValue(min), clampDmxValue(max)),
    max: Math.max(clampDmxValue(min), clampDmxValue(max)),
  }
}

export default function FixtureChannelPopup(props: Props) {
  const { ch, fixtureID, channelIndex, channelCount } = props
  const dispatch = useDispatch()
  const channels = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID]?.channels ?? []
  )

  function isDefaultMasterChannel(channel: FixtureChannel): boolean {
    return (
      channel.type === 'master' &&
      channel.min === DMX_MIN_VALUE &&
      channel.max === DMX_MAX_VALUE &&
      channel.isOnOff === false
    )
  }

  function nextColorChannel(current: FixtureChannel): FixtureChannel {
    if (current.type !== 'color') {
      return initFixtureChannel('color')
    }
    const currentColor = approximateStandardColor(current.color)
    const currentSequenceIndex = autoColorSequence.findIndex(
      (colorName) => colorName === currentColor
    )
    const nextColorName =
      currentSequenceIndex < 0
        ? autoColorSequence[0]
        : autoColorSequence[
            Math.min(currentSequenceIndex + 1, autoColorSequence.length - 1)
          ]
    return {
      type: 'color',
      color: colorByName(nextColorName),
    }
  }

  function suggestNextChannel(current: FixtureChannel): FixtureChannel {
    if (current.type === 'color') {
      return nextColorChannel(current)
    }
    if (current.type === 'split') {
      return initFixtureChannel('split')
    }
    return initFixtureChannel(current.type)
  }

  function seedNextChannelIfApplicable(currentChannel: FixtureChannel) {
    const nextChannelIndex = channelIndex + 1
    if (nextChannelIndex >= channelCount) {
      return
    }
    const nextChannel = channels[nextChannelIndex]
    if (nextChannel === undefined || !isDefaultMasterChannel(nextChannel)) {
      return
    }
    dispatch(
      editFixtureChannel({
        fixtureID,
        channelIndex: nextChannelIndex,
        newChannel: suggestNextChannel(currentChannel),
      })
    )
  }

  useEffect(() => {
    if (channelIndex <= 0 || !isDefaultMasterChannel(ch)) {
      return
    }
    const previousChannel = channels[channelIndex - 1]
    if (previousChannel === undefined || previousChannel.type === 'master') {
      return
    }
    dispatch(
      editFixtureChannel({
        fixtureID,
        channelIndex,
        newChannel: suggestNextChannel(previousChannel),
      })
    )
  }, [channelIndex, ch, channels, dispatch, fixtureID])

  return (
    <Content>
      <Row>
        <Info>Type:</Info>
        <ChannelPopupControl>
          <Select
            label="Channel Type"
            val={ch.type}
            items={channelTypes}
            labelForItem={channelTypeLabel}
            onChange={(newType) => {
              const newChannel =
                newType === 'split'
                  ? initChannelSplitFromChannel(ch)
                  : initFixtureChannel(newType)
              dispatch(
                editFixtureChannel({
                  fixtureID: fixtureID,
                  channelIndex: channelIndex,
                  newChannel,
                })
              )
              seedNextChannelIfApplicable(newChannel)
            }}
          />
        </ChannelPopupControl>
      </Row>
      <Fields {...props} />
    </Content>
  )
}

function channelTypeLabel(type: ChannelType): string {
  if (type === 'fxtrTrigger') return 'Fixture trigger (On/Off)'
  if (type === 'fxtrLevel') return 'Fixture level (Volume/Fan)'
  if (type === 'custom') return 'Custom (Optional FX)'
  if (type === 'axis') return 'Axis (Pan/Tilt)'
  if (type === 'colorMap') return 'Color Map'
  if (type === 'goboMap') return 'Gobo Map'
  if (type === 'focus') return 'Focus'
  if (type === 'prismMap') return 'Prism Map'
  if (type === 'split') return 'Split (Value Ranges)'
  return type[0].toUpperCase() + type.slice(1)
}

function Fields({ ch, fixtureID, channelIndex }: Props) {
  const dispatch = useDispatch()

  function updateChannel(newChannel: FixtureChannel) {
    dispatch(
      editFixtureChannel({
        fixtureID: fixtureID,
        channelIndex: channelIndex,
        newChannel: newChannel,
      })
    )
  }

  function dmxNumberField<Ch extends LeafFixtureChannel, Key extends keyof Ch>(
    channel: Ch,
    field: Key,
    label: string,
    onChange: (nextChannel: LeafFixtureChannel) => void
  ) {
    return (
      <NumberField
        // @ts-ignore shared editor helper for mixed channel fields
        val={channel[field]}
        label={label}
        min={DMX_MIN_VALUE}
        max={DMX_MAX_VALUE}
        onChange={(newVal) =>
          onChange({
            ...channel,
            [field]: newVal,
          })
        }
      />
    )
  }

  function renderLeafFields(
    channel: LeafFixtureChannel,
    onChange: (nextChannel: LeafFixtureChannel) => void,
    options: { compact: boolean }
  ) {
    const useRangeBoundsForMinMax = options.compact

    if (channel.type === 'color') {
      const colorProps: ColorChannelProps = {
        hue: channel.color.hue,
        saturation: channel.color.saturation,
        onChange: (newHue, newSaturation) => {
          onChange({
            type: 'color',
            color: {
              hue: newHue,
              saturation: newSaturation,
              kind: inferColorKind({ hue: newHue, saturation: newSaturation }),
            },
          })
        },
      }

      return (
        <>
          <ColorPicker
            color={channel.color}
            onChange={(newColor) =>
              onChange({
                type: 'color',
                color: newColor,
              })
            }
          />
          <HSpad {...colorProps} />
        </>
      )
    }

    if (channel.type === 'master') {
      return (
        <>
          {!useRangeBoundsForMinMax && (
            <>
              {dmxNumberField(channel, 'min', 'Min', onChange)}
              <Sp2 />
              {dmxNumberField(channel, 'max', 'Max', onChange)}
              <Sp2 />
            </>
          )}
          <Checkbox
            label="On/Off"
            checked={channel.isOnOff}
            onChange={(isOnOff) =>
              onChange({
                ...channel,
                isOnOff,
              })
            }
          />
        </>
      )
    }

    if (channel.type === 'strobe') {
      return (
        <>
          {dmxNumberField(channel, 'default_solid', 'Solid', onChange)}
          <Sp2 />
          {dmxNumberField(channel, 'default_strobe', 'Strobe', onChange)}
        </>
      )
    }

    if (channel.type === 'fxtrTrigger') {
      return (
        <>
          <Input
            value={channel.name}
            onChange={(newName) =>
              onChange({
                ...channel,
                name: newName,
              })
            }
          />
          {dmxNumberField(channel, 'off', 'Off', onChange)}
          <Sp2 />
          {dmxNumberField(channel, 'on', 'On', onChange)}
        </>
      )
    }

    if (channel.type === 'fxtrLevel') {
      return (
        <>
          <Input
            value={channel.name}
            onChange={(newName) =>
              onChange({
                ...channel,
                name: newName,
              })
            }
          />
          {dmxNumberField(channel, 'default', 'Default', onChange)}
          {!useRangeBoundsForMinMax && (
            <>
              <Sp2 />
              {dmxNumberField(channel, 'min', 'Min', onChange)}
              <Sp2 />
              {dmxNumberField(channel, 'max', 'Max', onChange)}
            </>
          )}
        </>
      )
    }

    if (channel.type === 'axis') {
      return (
        <>
          <Row>
            <Info>Direction:</Info>
            <Select
              label="Direction"
              val={channel.dir}
              items={axisDirList}
              labelForItem={axisDirName}
              onChange={(newAxisDir) =>
                onChange({
                  ...channel,
                  dir: newAxisDir as AxisDir,
                })
              }
            />
          </Row>
          <Checkbox
            label="Fine"
            checked={channel.isFine}
            onChange={(isFine) =>
              onChange({
                ...channel,
                isFine,
              })
            }
          />
          {!channel.isFine && !useRangeBoundsForMinMax && (
            <>
              <Sp2 />
              {dmxNumberField(channel, 'min', 'Min', onChange)}
              <Sp2 />
              {dmxNumberField(channel, 'max', 'Max', onChange)}
            </>
          )}
        </>
      )
    }

    if (channel.type === 'custom') {
      return (
        <>
          <Input
            value={channel.name}
            onChange={(newName) =>
              onChange({
                ...channel,
                name: newName,
              })
            }
          />
          {dmxNumberField(channel, 'default', 'Default', onChange)}
          <Sp2 />
          <Checkbox
            label="Controllable"
            checked={channel.isControllable}
            onChange={(isControllable) =>
              onChange({
                ...channel,
                isControllable,
              })
            }
          />
          {channel.isControllable && !useRangeBoundsForMinMax && (
            <>
              <Sp2 />
              {dmxNumberField(channel, 'min', 'Min', onChange)}
              <Sp2 />
              {dmxNumberField(channel, 'max', 'Max', onChange)}
            </>
          )}
        </>
      )
    }

    if (channel.type === 'colorMap') {
      return (
        <ColorMapChannel
          ch={channel}
          fixtureID={fixtureID}
          channelIndex={channelIndex}
          onChange={options.compact ? (newChannel) => onChange(newChannel) : undefined}
        />
      )
    }

    if (channel.type === 'goboMap') {
      return (
        <GoboMapChannel
          ch={channel}
          fixtureID={fixtureID}
          channelIndex={channelIndex}
          onChange={(newChannel) => onChange(newChannel)}
        />
      )
    }

    if (channel.type === 'focus') {
      return <FocusChannel ch={channel} onChange={(newChannel) => onChange(newChannel)} />
    }

    if (channel.type === 'prismMap') {
      return (
        <PrismMapChannel
          ch={channel}
          fixtureID={fixtureID}
          channelIndex={channelIndex}
          onChange={(newChannel) => onChange(newChannel)}
        />
      )
    }

    return null
  }

  if (ch.type === 'split') {
    const ranges = ch.ranges
    const updateRange = (index: number, nextRange: SplitChannelRange) => {
      const nextRanges = ranges.map((range, rangeIndex) =>
        rangeIndex === index ? nextRange : range
      )
      updateChannel({
        ...ch,
        ranges: nextRanges,
      })
    }

    return (
      <>
        <SectionTitle>Sub-Channels</SectionTitle>
        {ranges.map((range, rangeIndex) => {
          const bounds = clampRangeBounds(range.min, range.max)
          const normalizedRange: SplitChannelRange = {
            ...range,
            min: bounds.min,
            max: bounds.max,
          }

          return (
            <RangeCard key={range.id || `${rangeIndex}`}>
              <RangeHeader>
                <RangeTitle>{`Range ${rangeIndex + 1}`}</RangeTitle>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (ranges.length <= 1) {
                      return
                    }
                    const nextRanges = ranges.filter((_, i) => i !== rangeIndex)
                    updateChannel({
                      ...ch,
                      ranges: nextRanges,
                    })
                  }}
                  title="Remove split range"
                >
                  <RemoveIcon />
                </IconButton>
              </RangeHeader>
              <Input
                value={normalizedRange.name}
                onChange={(newName) =>
                  updateRange(rangeIndex, {
                    ...normalizedRange,
                    name: newName,
                  })
                }
              />
              <InlineRow>
                <NumberField
                  val={normalizedRange.min}
                  label="Min"
                  min={DMX_MIN_VALUE}
                  max={DMX_MAX_VALUE}
                  onChange={(nextMin) => {
                    const nextBounds = clampRangeBounds(nextMin, normalizedRange.max)
                    updateRange(rangeIndex, {
                      ...normalizedRange,
                      min: nextBounds.min,
                      max: nextBounds.max,
                    })
                  }}
                />
                <Sp2 />
                <NumberField
                  val={normalizedRange.max}
                  label="Max"
                  min={DMX_MIN_VALUE}
                  max={DMX_MAX_VALUE}
                  onChange={(nextMax) => {
                    const nextBounds = clampRangeBounds(normalizedRange.min, nextMax)
                    updateRange(rangeIndex, {
                      ...normalizedRange,
                      min: nextBounds.min,
                      max: nextBounds.max,
                    })
                  }}
                />
              </InlineRow>
              <Row>
                <Info>Sub-Type:</Info>
                <Select
                  label="Sub-Channel Type"
                  val={normalizedRange.channel.type}
                  items={nonSplitChannelTypes}
                  labelForItem={channelTypeLabel}
                  onChange={(nextType) =>
                    updateRange(rangeIndex, {
                      ...normalizedRange,
                      channel: initFixtureChannel(nextType) as LeafFixtureChannel,
                    })
                  }
                />
              </Row>
              {renderLeafFields(
                normalizedRange.channel,
                (nextLeafChannel) =>
                  updateRange(rangeIndex, {
                    ...normalizedRange,
                    channel: nextLeafChannel,
                  }),
                { compact: true }
              )}
            </RangeCard>
          )
        })}
        <Row>
          <IconButton
            size="small"
            title="Add split range (DMX band → sub-type)"
            onClick={() => {
              const rangeCount = ch.ranges.length
              const previousMax =
                rangeCount > 0 ? Math.max(...ch.ranges.map((range) => range.max)) : -1
              const nextMin = Math.min(DMX_MAX_VALUE, previousMax + 1)
              const nextRange = initSplitChannelRange(
                nextMin,
                DMX_MAX_VALUE,
                initFixtureChannel('custom') as LeafFixtureChannel,
                `Range ${rangeCount + 1}`
              )
              updateChannel({
                ...ch,
                ranges: [...ch.ranges, nextRange],
              })
            }}
          >
            <AddIcon />
          </IconButton>
          <InfoText>Add Range</InfoText>
        </Row>
      </>
    )
  }

  return renderLeafFields(ch, (nextChannel) => updateChannel(nextChannel), {
    compact: false,
  })
}

const ChannelPopupControl = styled.div`
  flex: 1 1 10rem;
  min-width: 0;
  max-width: 100%;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
`

const InlineRow = styled.div`
  display: flex;
  align-items: center;
`

const Content = styled.div`
  & > * {
    margin-bottom: 1rem;
  }
`

const Sp2 = styled.div`
  width: 1rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const InfoText = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const SectionTitle = styled.div`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const RangeCard = styled.div`
  border: 1px solid ${(props) => props.theme.colors.bg.lighter};
  border-radius: 0.35rem;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const RangeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const RangeTitle = styled.div`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text.secondary};
`
