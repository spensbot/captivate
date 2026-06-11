import { colorByName } from './dmxColors'
import {
  FixtureChannel,
  FixtureType,
  initChannelAxis,
  initChannelMaster,
  initFixtureChannel,
  initFixtureType,
  initSubFixture,
  normalizeFixtureModelConfig,
} from './dmxFixtures'

export type FixtureChannelTemplateId =
  | 'dimmer'
  | 'rgb'
  | 'rgb_dimmer'
  | 'rgbw'
  | 'mover_pt'

export type FixtureChannelTemplate = {
  id: FixtureChannelTemplateId
  label: string
  description: string
}

export const FIXTURE_CHANNEL_TEMPLATES: FixtureChannelTemplate[] = [
  {
    id: 'dimmer',
    label: 'Dimmer only',
    description: 'Single master (intensity) channel.',
  },
  {
    id: 'rgb',
    label: 'RGB',
    description: 'Red, green, and blue — no separate dimmer.',
  },
  {
    id: 'rgb_dimmer',
    label: 'Dimmer + RGB',
    description: 'Master plus red, green, and blue (most common PAR / wash).',
  },
  {
    id: 'rgbw',
    label: 'Dimmer + RGBW',
    description: 'Master plus red, green, blue, and white.',
  },
  {
    id: 'mover_pt',
    label: 'Dimmer + Pan + Tilt',
    description: 'Moving head: intensity, pan, and tilt.',
  },
]

export function buildFixtureChannelsFromTemplate(
  templateId: FixtureChannelTemplateId
): FixtureChannel[] {
  const red = initFixtureChannel('color')
  if (red.type === 'color') {
    red.color = colorByName('Red')
  }
  const green = initFixtureChannel('color')
  if (green.type === 'color') {
    green.color = colorByName('Green')
  }
  const blue = initFixtureChannel('color')
  if (blue.type === 'color') {
    blue.color = colorByName('Blue')
  }
  const white = initFixtureChannel('color')
  if (white.type === 'color') {
    white.color = colorByName('White')
  }

  switch (templateId) {
    case 'dimmer':
      return [initChannelMaster()]
    case 'rgb':
      return [red, green, blue]
    case 'rgb_dimmer':
      return [initChannelMaster(), red, green, blue]
    case 'rgbw':
      return [initChannelMaster(), red, green, blue, white]
    case 'mover_pt':
      return [
        initChannelMaster(),
        initChannelAxis('x', false),
        initChannelAxis('y', false),
      ]
    default:
      return [initChannelMaster()]
  }
}

export type SubfixtureSegmentSuggestion = {
  pixelCount: number
  segments: { name: string; channels: number[] }[]
  message: string
}

/** Suggest one segment per RGB triplet when many color channels are unassigned. */
export function suggestSubfixtureSegments(
  fixtureType: FixtureType
): SubfixtureSegmentSuggestion | null {
  if (fixtureType.subFixtures.length > 0) {
    return null
  }

  const colorIndices: number[] = []
  const masterIndices: number[] = []
  fixtureType.channels.forEach((ch, index) => {
    if (ch.type === 'color') {
      colorIndices.push(index)
    } else if (ch.type === 'master') {
      masterIndices.push(index)
    }
  })

  if (colorIndices.length < 3 || colorIndices.length % 3 !== 0) {
    return null
  }

  const pixelCount = colorIndices.length / 3
  if (pixelCount < 2) {
    return null
  }

  const segments: SubfixtureSegmentSuggestion['segments'] = []
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const rgb = [
      colorIndices[pixel * 3],
      colorIndices[pixel * 3 + 1],
      colorIndices[pixel * 3 + 2],
    ]
    const channels = [...new Set([...masterIndices, ...rgb])].sort((a, b) => a - b)
    segments.push({
      name: pixelCount <= 12 ? `Pixel ${pixel + 1}` : `Zone ${pixel + 1}`,
      channels,
    })
  }

  return {
    pixelCount,
    segments,
    message: `This fixture has ${pixelCount} RGB groups (${colorIndices.length} color channels). Create ${pixelCount} segments so each pixel can be controlled separately?`,
  }
}

export function applySubfixtureSuggestion(
  fixtureType: FixtureType,
  suggestion: SubfixtureSegmentSuggestion
): FixtureType {
  return {
    ...fixtureType,
    subFixtures: suggestion.segments.map((segment) => ({
      ...initSubFixture(),
      name: segment.name,
      channels: [...segment.channels],
      groups: [],
    })),
  }
}

export function applyFixtureChannelTemplate(
  fixtureType: FixtureType,
  templateId: FixtureChannelTemplateId
): FixtureType {
  return {
    ...fixtureType,
    channels: buildFixtureChannelsFromTemplate(templateId),
    subFixtures: [],
  }
}

/** Defaults for the custom fixture creation wizard (friendly labels, normalized model). */
export function initFixtureTypeForCreation(): FixtureType {
  const fixture = initFixtureType()
  fixture.name = 'New Fixture'
  fixture.manufacturer = ''
  fixture.channels = buildFixtureChannelsFromTemplate('rgb_dimmer')
  fixture.model = normalizeFixtureModelConfig(fixture.model, fixture)
  return fixture
}

const OPEN_MODEL_WIZARD_AFTER_CREATE_KEY =
  'captivate.fixtureWizard.openModelAfterCreate'

export function readOpenModelWizardAfterCreatePreference(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(OPEN_MODEL_WIZARD_AFTER_CREATE_KEY) === 'true'
}

export function writeOpenModelWizardAfterCreatePreference(value: boolean): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(
    OPEN_MODEL_WIZARD_AFTER_CREATE_KEY,
    value ? 'true' : 'false'
  )
}
