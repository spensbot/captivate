import { nanoid } from 'nanoid'
import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  FixtureChannel,
  FixtureType,
  GoboMapItem,
  initChannelAxis,
  initChannelColor,
  initChannelColorMap,
  initChannelCustom,
  initChannelGoboMap,
  initChannelMaster,
  initChannelStrobe,
} from './dmxFixtures'
import { ColorKind } from './dmxColors'

type JsonRecord = { [key: string]: unknown }

type OflCapability = {
  type?: unknown
  dmxRange?: unknown
  color?: unknown
  colors?: unknown
  slotNumber?: unknown
  wheel?: unknown
  comment?: unknown
}

type OflChannel = {
  capability?: unknown
  capabilities?: unknown
  fineChannelAliases?: unknown
}

type OflWheelSlot = {
  type?: unknown
  name?: unknown
  colors?: unknown
}

type OflWheel = {
  slots?: unknown
}

type OflMode = {
  name?: unknown
  channels?: unknown
}

type OflFixtureDefinition = {
  $schema?: unknown
  manufacturer?: unknown
  name?: unknown
  shortName?: unknown
  availableChannels?: unknown
  modes?: unknown
  wheels?: unknown
}

type ParseOptions = {
  manufacturer?: string
  sourceName?: string
}

type ColorEntry = {
  max: number
  hue: number
  saturation: number
  kind?: ColorKind
}

function asRecord(value: unknown): JsonRecord | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord
  }
  return null
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return fallback
}

function clampDmx(value: unknown, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(DMX_MIN_VALUE, Math.min(DMX_MAX_VALUE, Math.round(numeric)))
}

function getCapabilityMax(
  capability: OflCapability,
  fallbackIndex: number,
  fallbackCount: number
): number {
  const dmxRange = ensureArray(capability.dmxRange as [number, number])
  if (dmxRange.length >= 2) {
    return clampDmx(dmxRange[1], DMX_MAX_VALUE)
  }

  return clampDmx(
    Math.round(((fallbackIndex + 1) / Math.max(1, fallbackCount)) * DMX_MAX_VALUE),
    DMX_MAX_VALUE
  )
}

function getHue(color: string): number | null {
  const normalized = color.toLowerCase()
  if (normalized.includes('red')) return 0
  if (normalized.includes('green')) return 0.333
  if (normalized.includes('blue')) return 0.667
  if (normalized.includes('cyan')) return 0.5
  if (normalized.includes('magenta')) return 0.833
  if (normalized.includes('yellow')) return 0.167
  if (normalized.includes('amber')) return 0.12
  if (normalized.includes('indigo')) return 0.76
  if (normalized.includes('lime')) return 0.25
  return null
}

function detectColorKind(text: string): ColorKind {
  const lower = text.toLowerCase()
  if (lower.includes('warm white') || lower.includes('ww')) return 'warmWhite'
  if (lower.includes('amber')) return 'amber'
  if (lower.includes('uv') || lower.includes('ultraviolet')) return 'uv'
  if (lower.includes('white')) return 'white'
  return 'color'
}

function parseHexColor(value: string): { hue: number; saturation: number } | null {
  const hex = value.replace('#', '').trim()
  const isShort = hex.length === 3
  const isLong = hex.length === 6
  if (!isShort && !isLong) return null

  const expanded = isShort
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex

  const rgb = Number.parseInt(expanded, 16)
  if (!Number.isFinite(rgb)) return null

  const r = ((rgb >> 16) & 255) / 255
  const g = ((rgb >> 8) & 255) / 255
  const b = (rgb & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const saturation = max === 0 ? 0 : delta / max

  if (delta === 0) {
    return { hue: 0, saturation: 0 }
  }

  let hue = 0
  if (max === r) {
    hue = ((g - b) / delta) % 6
  } else if (max === g) {
    hue = (b - r) / delta + 2
  } else {
    hue = (r - g) / delta + 4
  }

  hue /= 6
  if (hue < 0) hue += 1
  return { hue, saturation }
}

function getCapabilityType(capability: OflCapability): string {
  return normalizeString(capability.type, '').toLowerCase()
}

function capabilityTypes(capabilities: OflCapability[]): string[] {
  return capabilities.map(getCapabilityType)
}

function hasCapabilityType(capabilities: OflCapability[], pattern: string): boolean {
  return capabilityTypes(capabilities).some((type) => type.includes(pattern))
}

function getCapabilities(channel: OflChannel): OflCapability[] {
  const capabilities = ensureArray(channel.capabilities as OflCapability[])
  if (capabilities.length > 0) return capabilities

  const single = asRecord(channel.capability) as OflCapability | null
  return single ? [single] : []
}

function buildFineAliasMap(
  availableChannels: { [channelName: string]: OflChannel }
): { [alias: string]: string } {
  const fineAliases: { [alias: string]: string } = {}

  for (const [channelName, channel] of Object.entries(availableChannels)) {
    const aliases = ensureArray(channel.fineChannelAliases as string[])
    for (const alias of aliases) {
      if (typeof alias === 'string' && alias.trim().length > 0) {
        fineAliases[alias.trim()] = channelName
      }
    }
  }

  return fineAliases
}

function getWheels(raw: unknown): { [wheelName: string]: OflWheel } {
  const wheels = asRecord(raw)
  if (wheels === null) return {}

  const mapped: { [wheelName: string]: OflWheel } = {}
  for (const [wheelName, wheelDef] of Object.entries(wheels)) {
    const record = asRecord(wheelDef)
    if (record !== null) {
      mapped[wheelName] = record as OflWheel
    }
  }

  return mapped
}

function getWheelSlot(
  capability: OflCapability,
  wheels: { [wheelName: string]: OflWheel }
): OflWheelSlot | null {
  const wheelName = normalizeString(capability.wheel, '')
  if (wheelName.length === 0) return null

  const wheel = wheels[wheelName]
  if (wheel === undefined) return null

  const slots = ensureArray(wheel.slots as OflWheelSlot[])
  if (slots.length === 0) return null

  const slotNumber = Number(capability.slotNumber)
  if (!Number.isFinite(slotNumber)) return null

  const index = Math.max(0, Math.min(slots.length - 1, Math.round(slotNumber) - 1))
  const slot = asRecord(slots[index])
  return slot as OflWheelSlot | null
}

function colorEntryFromText(text: string, max: number): ColorEntry | null {
  const kind = detectColorKind(text)

  if (kind !== 'color') {
    return {
      max,
      hue: 0,
      saturation: 0,
      kind,
    }
  }

  const hue = getHue(text)
  if (hue === null) return null

  return {
    max,
    hue,
    saturation: 1,
    kind: 'color',
  }
}

function capabilityText(capability: OflCapability, slot: OflWheelSlot | null): string {
  const primary = normalizeString(capability.comment, '')
  if (primary.length > 0) return primary

  const color = normalizeString(capability.color, '')
  if (color.length > 0) return color

  if (slot !== null) {
    const name = normalizeString(slot.name, '')
    if (name.length > 0) return name
    const slotType = normalizeString(slot.type, '')
    if (slotType.length > 0) return slotType
  }

  return ''
}

function capabilityColorEntry(
  capability: OflCapability,
  index: number,
  count: number,
  wheels: { [wheelName: string]: OflWheel }
): ColorEntry | null {
  const max = getCapabilityMax(capability, index, count)
  const slot = getWheelSlot(capability, wheels)

  const slotColors = slot ? ensureArray(slot.colors as string[]) : []
  const slotHexColor = slotColors.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  )

  if (typeof slotHexColor === 'string') {
    const hsv = parseHexColor(slotHexColor)
    if (hsv !== null) {
      return {
        max,
        hue: hsv.hue,
        saturation: hsv.saturation,
        kind: hsv.saturation < 0.02 ? 'white' : 'color',
      }
    }
  }

  const text = capabilityText(capability, slot)
  return colorEntryFromText(text, max)
}

function buildColorMapChannel(
  capabilities: OflCapability[],
  wheels: { [wheelName: string]: OflWheel }
): FixtureChannel {
  const colors = capabilities
    .map((capability, index) =>
      capabilityColorEntry(capability, index, capabilities.length, wheels)
    )
    .filter((entry): entry is ColorEntry => entry !== null)
    .sort((left, right) => left.max - right.max)

  if (colors.length === 0) {
    return initChannelColorMap([{ max: 0, hue: 0, saturation: 1, kind: 'color' }])
  }

  return initChannelColorMap(colors)
}

function buildGoboMapChannel(
  capabilities: OflCapability[],
  wheels: { [wheelName: string]: OflWheel }
): FixtureChannel {
  const gobos: GoboMapItem[] = capabilities.map((capability, index) => {
    const slot = getWheelSlot(capability, wheels)
    const slotName = slot ? normalizeString(slot.name, '') : ''
    const slotType = slot ? normalizeString(slot.type, '') : ''
    const capabilityName = normalizeString(capability.comment, '')
    const name =
      slotName ||
      capabilityName ||
      (slotType.length > 0 ? slotType : `Gobo ${index + 1}`)

    return {
      name,
      max: getCapabilityMax(capability, index, capabilities.length),
    }
  })

  if (gobos.length === 0) {
    return initChannelGoboMap([{ name: 'Open', max: DMX_MIN_VALUE }])
  }

  return initChannelGoboMap(gobos.sort((left, right) => left.max - right.max))
}

function detectColorChannel(channelName: string, capabilities: OflCapability[]): boolean {
  const lower = channelName.toLowerCase()
  if (
    lower.includes('red') ||
    lower.includes('green') ||
    lower.includes('blue') ||
    lower.includes('white') ||
    lower.includes('amber') ||
    lower.includes('uv') ||
    lower.includes('cyan') ||
    lower.includes('magenta') ||
    lower.includes('yellow')
  ) {
    return true
  }

  return hasCapabilityType(capabilities, 'color')
}

function convertOflChannel(
  channelName: string,
  channel: OflChannel,
  options: {
    wheels: { [wheelName: string]: OflWheel }
    isFineAlias: boolean
  }
): FixtureChannel {
  const lowerName = channelName.toLowerCase()
  const capabilities = getCapabilities(channel)

  const isPan =
    lowerName.includes('pan') ||
    hasCapabilityType(capabilities, 'pan')
  const isTilt =
    lowerName.includes('tilt') ||
    hasCapabilityType(capabilities, 'tilt')

  if (options.isFineAlias || lowerName.includes('fine')) {
    if (isPan) return initChannelAxis('x', true)
    if (isTilt) return initChannelAxis('y', true)
  }

  if (isPan) return initChannelAxis('x', false)
  if (isTilt) return initChannelAxis('y', false)

  if (
    hasCapabilityType(capabilities, 'intensity') ||
    (lowerName.includes('dimmer') && !detectColorChannel(channelName, capabilities)) ||
    lowerName.includes('master')
  ) {
    return initChannelMaster()
  }

  if (hasCapabilityType(capabilities, 'focus') || lowerName.includes('focus')) {
    return initChannelCustom('Focus')
  }

  if (
    hasCapabilityType(capabilities, 'shutterstrobe') ||
    lowerName.includes('strobe') ||
    lowerName.includes('shutter')
  ) {
    return initChannelStrobe()
  }

  const directColorHue = getHue(channelName)
  if (directColorHue !== null) {
    return initChannelColor(directColorHue, 1)
  }
  if (lowerName.includes('white')) return initChannelColor(0, 0)

  const hasWheelSlots = hasCapabilityType(capabilities, 'wheelslot')
  if (hasWheelSlots) {
    if (lowerName.includes('gobo')) {
      return buildGoboMapChannel(capabilities, options.wheels)
    }
    if (lowerName.includes('color')) {
      return buildColorMapChannel(capabilities, options.wheels)
    }

    const containsColorSlot = capabilities.some((capability) => {
      const slot = getWheelSlot(capability, options.wheels)
      if (slot === null) return false
      const slotType = normalizeString(slot.type, '').toLowerCase()
      const slotName = normalizeString(slot.name, '').toLowerCase()
      return (
        slotType.includes('color') ||
        slotName.includes('color') ||
        getHue(slotName) !== null
      )
    })

    if (containsColorSlot) {
      return buildColorMapChannel(capabilities, options.wheels)
    }

    return buildGoboMapChannel(capabilities, options.wheels)
  }

  return initChannelCustom(channelName)
}

function parseFixtureDefinition(input: unknown): OflFixtureDefinition {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as OflFixtureDefinition
    } catch (_err) {
      throw new Error('Invalid Open Fixture Library JSON fixture.')
    }
  }

  const record = asRecord(input)
  if (record === null) {
    throw new Error('Invalid Open Fixture Library fixture payload.')
  }
  return record as OflFixtureDefinition
}

export function looksLikeOflFixtureDefinition(input: unknown): boolean {
  const definition = asRecord(input)
  if (definition === null) return false

  const schema = normalizeString(definition.$schema, '')
  if (schema.toLowerCase().includes('open-fixture-library')) {
    return true
  }

  return (
    typeof definition.name === 'string' &&
    asRecord(definition.availableChannels) !== null &&
    Array.isArray(definition.modes)
  )
}

export function parseOflFixtureDefinition(
  input: unknown,
  options?: ParseOptions
): FixtureType[] {
  const definition = parseFixtureDefinition(input)
  if (!looksLikeOflFixtureDefinition(definition)) {
    throw new Error('Not a valid Open Fixture Library fixture definition.')
  }

  const availableChannelsRecord = asRecord(definition.availableChannels)
  if (availableChannelsRecord === null) {
    throw new Error('Open Fixture Library fixture is missing availableChannels.')
  }

  const availableChannels: { [channelName: string]: OflChannel } = {}
  for (const [channelName, channel] of Object.entries(availableChannelsRecord)) {
    const channelRecord = asRecord(channel)
    if (channelRecord !== null) {
      availableChannels[channelName] = channelRecord as OflChannel
    }
  }

  const fineAliases = buildFineAliasMap(availableChannels)
  const wheels = getWheels(definition.wheels)
  const modes = ensureArray(definition.modes as OflMode[])
  if (modes.length === 0) {
    throw new Error('Open Fixture Library fixture does not contain any modes.')
  }

  const modelName = normalizeString(
    definition.name,
    normalizeString(definition.shortName, options?.sourceName ?? 'Imported OFL Fixture')
  )
  const manufacturer = normalizeString(
    options?.manufacturer,
    normalizeString(definition.manufacturer, 'Unknown')
  )

  return modes.map((mode, modeIndex) => {
    const modeName = normalizeString(mode.name, `Mode ${modeIndex + 1}`)
    const modeChannels = ensureArray(mode.channels as unknown[])
    const channels: FixtureChannel[] = modeChannels.map((entry, channelIndex) => {
      if (entry === null) {
        return initChannelCustom('No Function')
      }

      if (typeof entry === 'string') {
        const channel = availableChannels[entry]
        if (channel !== undefined) {
          return convertOflChannel(entry, channel, {
            wheels,
            isFineAlias: false,
          })
        }

        const aliasBaseName = fineAliases[entry]
        if (aliasBaseName !== undefined) {
          const aliasBaseChannel = availableChannels[aliasBaseName]
          if (aliasBaseChannel !== undefined) {
            return convertOflChannel(aliasBaseName, aliasBaseChannel, {
              wheels,
              isFineAlias: true,
            })
          }
        }

        return initChannelCustom(entry)
      }

      const entryRecord = asRecord(entry)
      if (entryRecord !== null) {
        const embeddedChannel = normalizeString(entryRecord.channel, '')
        if (embeddedChannel.length > 0) {
          const channel = availableChannels[embeddedChannel]
          if (channel !== undefined) {
            return convertOflChannel(embeddedChannel, channel, {
              wheels,
              isFineAlias: false,
            })
          }
          return initChannelCustom(embeddedChannel)
        }

        const insert = normalizeString(entryRecord.insert, '')
        if (insert.length > 0) {
          return initChannelCustom(insert)
        }
      }

      return initChannelCustom(`Channel ${channelIndex + 1}`)
    })

    const fixtureName = modes.length === 1 ? modelName : `${modelName} (${modeName})`

    return {
      id: nanoid(),
      name: fixtureName,
      manufacturer,
      intensity: 0,
      channels,
      subFixtures: [],
      groups: [],
    }
  })
}
