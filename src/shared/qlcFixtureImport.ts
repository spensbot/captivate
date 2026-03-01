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
import { XMLParser, X2jOptionsOptional } from 'fast-xml-parser'

interface QlcCapability {
  '#text'?: string
  '@_Max'?: string | number
}

interface QlcChannel {
  '@_Name'?: string
  '@_Preset'?: string
  Capability?: QlcCapability | QlcCapability[]
}

interface QlcFixtureModeChannel {
  '#text'?: string
}

interface QlcFixtureMode {
  '@_Name'?: string
  Channel?: QlcFixtureModeChannel | QlcFixtureModeChannel[]
}

interface QlcFixtureDefinition {
  Manufacturer?: string
  Model?: string
  Channel?: QlcChannel | QlcChannel[]
  Mode?: QlcFixtureMode | QlcFixtureMode[]
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
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(num)))
}

function getHue(color: string): number | null {
  if (color === 'Red') return 0
  if (color === 'Green') return 0.333
  if (color === 'Blue') return 0.667
  if (color === 'Cyan') return 0.5
  if (color === 'Magenta') return 0.833
  if (color === 'Yellow') return 0.167
  if (color === 'Amber') return 0.12
  if (color === 'Indigo') return 0.76
  if (color === 'Lime') return 0.25
  return null
}

function capabilityText(capability: QlcCapability): string {
  return normalizeString(capability['#text'], '')
}

function detectCapabilityKind(text: string): ColorKind {
  const lower = text.toLowerCase()
  if (lower.includes('warm white') || lower.includes('ww')) return 'warmWhite'
  if (lower.includes('amber')) return 'amber'
  if (lower.includes('uv') || lower.includes('ultraviolet')) return 'uv'
  if (lower.includes('white')) return 'white'
  return 'color'
}

function colorEntryForCapability(
  capability: QlcCapability,
  fallbackMax: number
):
  | {
      max: number
      hue: number
      saturation: number
      kind?: ColorKind
    }
  | null {
  const text = capabilityText(capability)
  const max = clampDmx(capability['@_Max'], fallbackMax)
  const kind = detectCapabilityKind(text)

  if (kind !== 'color') {
    return {
      max,
      hue: 0,
      saturation: 0,
      kind,
    }
  }

  const detectedHue = ['Red', 'Green', 'Blue', 'Cyan', 'Magenta', 'Yellow', 'Amber', 'Indigo', 'Lime']
    .map((name) => ({ name, hue: getHue(name) }))
    .find((item) => item.hue !== null && text.toLowerCase().includes(item.name.toLowerCase()))

  if (detectedHue?.hue === undefined || detectedHue.hue === null) {
    return null
  }

  return {
    max,
    hue: detectedHue.hue,
    saturation: 1,
    kind: 'color',
  }
}

function buildColorMapFromCapabilities(capabilities: QlcCapability[]): FixtureChannel {
  const colors = capabilities
    .map((capability, index) =>
      colorEntryForCapability(capability, Math.round(((index + 1) / capabilities.length) * DMX_MAX_VALUE))
    )
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.max - right.max)

  if (colors.length === 0) {
    return initChannelColorMap([{ max: 0, hue: 0, saturation: 1, kind: 'color' }])
  }

  return initChannelColorMap(colors)
}

function buildGoboMapFromCapabilities(capabilities: QlcCapability[]): FixtureChannel {
  const gobos: GoboMapItem[] = capabilities.map((capability, index) => {
    const name = normalizeString(capabilityText(capability), `Gobo ${index + 1}`)
    return {
      name,
      max: clampDmx(capability['@_Max'], Math.round(((index + 1) / capabilities.length) * DMX_MAX_VALUE)),
    }
  })

  if (gobos.length === 0) {
    return initChannelGoboMap([{ name: 'Open', max: DMX_MIN_VALUE }])
  }

  return initChannelGoboMap(gobos.sort((left, right) => left.max - right.max))
}

function convertQlcChannel(channel: QlcChannel): FixtureChannel {
  const preset = normalizeString(channel['@_Preset'], '')
  const name = normalizeString(channel['@_Name'], 'Channel')
  const capabilities = ensureArray(channel.Capability)

  if (preset === 'Custom' || preset === 'NoFunction') {
    return initChannelCustom(name)
  }

  if (preset.includes('Intensity')) {
    if (preset.includes('Fine')) {
      return initChannelCustom(name)
    }
    if (preset.includes('MasterDimmer') || preset.includes('Dimmer')) {
      return initChannelMaster()
    }
    if (preset.includes('White')) return initChannelColor(0, 0)
    if (preset.includes('Amber')) return initChannelColor(0.12, 1)
    if (preset.includes('UV')) return initChannelCustom('UV')
    if (preset.includes('Red')) return initChannelColor(0, 1)
    if (preset.includes('Green')) return initChannelColor(0.333, 1)
    if (preset.includes('Blue')) return initChannelColor(0.667, 1)
    if (preset.includes('Cyan')) return initChannelColor(0.5, 1)
    if (preset.includes('Magenta')) return initChannelColor(0.833, 1)
    if (preset.includes('Yellow')) return initChannelColor(0.167, 1)
    return initChannelCustom(name)
  }

  if (preset.includes('Position')) {
    const dir = preset.includes('Pan') || preset.includes('XAxis') ? 'x' : 'y'
    const isFine = preset.includes('Fine')
    return initChannelAxis(dir, isFine)
  }

  if (preset === 'ShutterStrobeSlowFast') {
    return initChannelStrobe()
  }
  if (preset === 'ShutterStrobeFastSlow') {
    return {
      type: 'strobe',
      default_solid: DMX_MAX_VALUE,
      default_strobe: DMX_MIN_VALUE,
    }
  }

  if (preset === 'ColorMacro' || preset === 'ColorWheel') {
    return buildColorMapFromCapabilities(capabilities)
  }

  if (preset === 'GoboWheel' || preset === 'GoboIndex') {
    return buildGoboMapFromCapabilities(capabilities)
  }

  if (preset.includes('BeamFocus')) {
    return initChannelCustom('Focus')
  }

  return initChannelCustom(name)
}

function createParser(): XMLParser {
  const options: X2jOptionsOptional = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    trimValues: true,
  }

  return new XMLParser(options)
}

export function looksLikeQlcFixtureDefinition(serialized: string): boolean {
  const text = serialized.trim()
  if (text.length === 0) return false
  return text.includes('<FixtureDefinition') || text.includes('<!DOCTYPE FixtureDefinition')
}

export function parseQlcFixtureDefinition(
  serialized: string,
  sourceName: string = 'Imported QLC Fixture'
): FixtureType[] {
  const parser = createParser()
  let parsed: unknown
  try {
    parsed = parser.parse(serialized)
  } catch (_err) {
    throw new Error('Invalid QLC+ fixture XML.')
  }

  const root = (parsed as { FixtureDefinition?: unknown }).FixtureDefinition
  if (root === undefined || root === null || typeof root !== 'object') {
    throw new Error('QLC+ fixture file missing FixtureDefinition root.')
  }

  const definition = root as QlcFixtureDefinition
  const manufacturer = normalizeString(definition.Manufacturer, 'Unknown')
  const model = normalizeString(definition.Model, sourceName)
  const pool = ensureArray(definition.Channel)
  const modes = ensureArray(definition.Mode)

  const channelsByName: { [name: string]: QlcChannel } = {}
  pool.forEach((channel, index) => {
    const channelName = normalizeString(channel['@_Name'], `Channel ${index + 1}`)
    channelsByName[channelName] = channel
  })

  if (modes.length === 0) {
    throw new Error('QLC+ fixture file does not contain any modes.')
  }

  return modes.map((mode, modeIndex) => {
    const modeName = normalizeString(mode['@_Name'], `Mode ${modeIndex + 1}`)
    const modeChannels = ensureArray(mode.Channel)
    const channels: FixtureChannel[] = modeChannels.map((entry, entryIndex) => {
      const refName = normalizeString(entry['#text'], `Channel ${entryIndex + 1}`)
      const source = channelsByName[refName]
      if (source === undefined) {
        return initChannelCustom(refName)
      }
      return convertQlcChannel(source)
    })

    const name = modes.length === 1 ? model : `${model} (${modeName})`

    return {
      id: nanoid(),
      name,
      manufacturer,
      intensity: 0,
      channels,
      subFixtures: [],
      groups: [],
    }
  })
}

