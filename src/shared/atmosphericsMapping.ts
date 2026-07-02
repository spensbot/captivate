import { DmxState } from '../renderer/redux/dmxSlice'
import {
  ATMOSPHERICS_DEFAULT_GROUP,
  AtmosFxtrDesc,
  normAtmosFxtrDesc,
} from './atmospherics'
import {
  Fixture,
  FixtureChannel,
  fixtureChannelLeafChannels,
  FixtureType,
  inferFixtureModelKind,
  normalizeFixtureModelConfig,
  Universe,
} from './dmxFixtures'

function channelNameOrDefault(channel: FixtureChannel, fallback: string) {
  if ('name' in channel && typeof channel.name === 'string') {
    const trimmed = channel.name.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return fallback
}

function normalizedChannelName(channel: FixtureChannel) {
  if ('name' in channel && typeof channel.name === 'string') {
    return channel.name.trim().toLowerCase()
  }
  return ''
}

function isAtmosCustomChannelName(name: string) {
  if (name.length <= 0) return false
  const keywords = [
    'volume',
    'fan',
    'fog',
    'haze',
    'bubble',
    'confetti',
    'co2',
    'flame',
    'pyro',
    'output',
    'pump',
    'mist',
    'jet',
    'trigger',
    'on/off',
    'on off',
    'onoff',
    'fx',
  ]
  const exclusions = ['pan', 'tilt', 'speed', 'gobo', 'zoom', 'focus']
  if (exclusions.some((token) => name.includes(token))) {
    return false
  }
  return keywords.some((token) => name.includes(token))
}

function isAtmosAuxChannel(channel: FixtureChannel) {
  return (
    channel.type === 'fxtrLevel' ||
    (channel.type === 'custom' &&
      channel.isControllable === true &&
      isAtmosCustomChannelName(normalizedChannelName(channel)))
  )
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

type LogicalAtmosChannel = {
  channel: FixtureChannel
  min: number
  max: number
}

function extractLogicalChannels(channel: FixtureChannel): LogicalAtmosChannel[] {
  if (channel.type !== 'split') {
    return [{ channel, min: 0, max: 255 }]
  }

  return channel.ranges.map((range) => ({
    channel: range.channel,
    min: Math.min(range.min, range.max),
    max: Math.max(range.min, range.max),
  }))
}

export function isAtmosFxtrType(fixtureType: FixtureType): boolean {
  return fixtureType.channels
    .flatMap((channel) => fixtureChannelLeafChannels(channel))
    .some(
      (channel) =>
        channel.type === 'fxtrTrigger' ||
        channel.type === 'fxtrLevel' ||
        (channel.type === 'custom' &&
          channel.isControllable === true &&
          isAtmosCustomChannelName(channel.name.trim().toLowerCase()))
    )
}

export function isMappedAtmosphericFixture(
  _fixture: Fixture,
  fixtureType: FixtureType
): boolean {
  if (!isAtmosFxtrType(fixtureType)) {
    return false
  }
  const model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)
  const effectiveKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  return effectiveKind === 'atmosphericFxtr'
}

export function universeHasAtmospherics(
  universe: Universe,
  fixtureTypesByID: { [id: string]: FixtureType | undefined }
): boolean {
  return (
    listAtmosFxtrs({ universe, fixtureTypesByID } as DmxState).length > 0
  )
}

function getFixtureGroups(fixtureGroups: string[]): string[] {
  const groups = new Set<string>()
  fixtureGroups
    .map((group) => group.trim())
    .filter((group) => group.length > 0)
    .forEach((group) => groups.add(group))
  groups.add(ATMOSPHERICS_DEFAULT_GROUP)
  return Array.from(groups)
}

export function listAtmosFxtrs(
  dmx: DmxState
): AtmosFxtrDesc[] {
  const descriptors: AtmosFxtrDesc[] = []

  for (const fixture of dmx.universe) {
    const fixtureType = dmx.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) {
      continue
    }
    if (!isMappedAtmosphericFixture(fixture, fixtureType)) {
      continue
    }
    const fixtureId = typeof fixture.id === 'string' ? fixture.id.trim() : ''
    if (fixtureId.length <= 0) {
      continue
    }

    const triggerChannels: AtmosFxtrDesc['triggerChannels'] = []
    const auxChannels: AtmosFxtrDesc['auxChannels'] = []
    fixtureType.channels.forEach((channel, channelIndex) => {
      const channelNumber = fixture.ch + channelIndex
      if (channelNumber < 1 || channelNumber > 512) {
        return
      }

      const logicalChannels = extractLogicalChannels(channel)
      logicalChannels.forEach((logicalChannel) => {
        const logical = logicalChannel.channel
        if (logical.type === 'fxtrTrigger') {
          triggerChannels.push({
            channel: channelNumber,
            name: channelNameOrDefault(logical, `Trigger ${triggerChannels.length + 1}`),
            off: clampToRange(logical.off, logicalChannel.min, logicalChannel.max),
            on: clampToRange(logical.on, logicalChannel.min, logicalChannel.max),
          })
          return
        }

        if (!isAtmosAuxChannel(logical)) {
          return
        }

        if (logical.type === 'fxtrLevel') {
          auxChannels.push({
            channel: channelNumber,
            name: channelNameOrDefault(logical, `Level ${auxChannels.length + 1}`),
            min: clampToRange(logical.min, logicalChannel.min, logicalChannel.max),
            max: clampToRange(logical.max, logicalChannel.min, logicalChannel.max),
            defaultValue: clampToRange(
              logical.default,
              logicalChannel.min,
              logicalChannel.max
            ),
          })
          return
        }

        if (logical.type === 'custom') {
          auxChannels.push({
            channel: channelNumber,
            name: channelNameOrDefault(logical, `Control ${auxChannels.length + 1}`),
            min: clampToRange(logical.min, logicalChannel.min, logicalChannel.max),
            max: clampToRange(logical.max, logicalChannel.min, logicalChannel.max),
            defaultValue: clampToRange(
              logical.default,
              logicalChannel.min,
              logicalChannel.max
            ),
          })
        }
      })
    })

    if (triggerChannels.length <= 0 && auxChannels.length <= 0) {
      continue
    }

    descriptors.push(
      normAtmosFxtrDesc({
        fixtureId,
        fixtureName:
          (fixture.name?.trim() || fixtureType.name?.trim()) ?? `Fixture ${fixtureId}`,
        universe: fixture.universe ?? 1,
        groups: getFixtureGroups(fixture.groups),
        triggerChannels,
        auxChannels,
      })
    )
  }

  return descriptors
}

