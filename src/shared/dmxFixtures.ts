import { Window2D_t } from '../types/baseTypes'
import { Color } from './dmxColors'
import { nanoid } from 'nanoid'
import { DEFAULT_GROUP } from './Scenes'

export const DMX_MAX_VALUE = 255
export const DMX_NUM_CHANNELS = 512
export const DMX_DEFAULT_VALUE = 0

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export type AxisDir = 'x' | 'y'
export const axisDirList = ['x', 'y']

type ChannelMaster = {
  type: 'master'
}

type ChannelColor = {
  type: 'color'
  color: Color
}

type ChannelStrobe = {
  type: 'strobe'
  default_strobe: DmxValue
  default_solid: DmxValue
}

type ChannelOther = {
  type: 'other'
  default: DmxValue
}

type ChannelAxis = {
  type: 'axis'
  dir: AxisDir
  min: DmxValue
  max: DmxValue
}

export type ColorMapColor = { max: number; hue: number }

type ChannelColorMap = {
  type: 'colorMap'
  colors: ColorMapColor[]
}

export type FixtureChannel =
  | ChannelMaster
  | ChannelColor
  | ChannelStrobe
  | ChannelAxis
  | ChannelColorMap
  | ChannelOther

export type ChannelType = FixtureChannel['type']

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'strobe',
  'axis',
  'colorMap',
  'other',
]

export function initFixtureChannel(
  type?: FixtureChannel['type']
): FixtureChannel {
  if (type === 'color') {
    return {
      type: type,
      color: 'white',
    }
  } else if (type === 'other') {
    return {
      type: type,
      default: 0,
    }
  } else if (type === 'strobe') {
    return {
      type: type,
      default_solid: 0,
      default_strobe: 255,
    }
  } else if (type === 'axis') {
    return {
      type: type,
      dir: 'x',
      min: 1,
      max: 255,
    }
  } else if (type === 'colorMap') {
    return {
      type: type,
      colors: [],
    }
  }
  return {
    type: 'master',
  }
}

export type FixtureType = {
  id: string
  name: string
  epicness: number
  manufacturer?: string
  channels: FixtureChannel[]
}

const parFixture: FixtureType = {
  id: '1',
  manufacturer: 'YeeSaw',
  name: 'Par',
  epicness: 0.3,
  channels: [
    { type: 'master' },
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'color', color: 'white' },
    { type: 'other', default: 0 },
    { type: 'strobe', default_solid: 0, default_strobe: 241 },
    { type: 'other', default: 0 },
  ],
}

const stringLightFixture: FixtureType = {
  id: '2',
  name: 'Light String',
  epicness: 0.3,
  channels: [{ type: 'master' }],
}

const strobeFixture: FixtureType = {
  id: '3',
  manufacturer: 'DragonX',
  name: 'Strobe',
  epicness: 0.8,
  channels: [
    { type: 'master' },
    { type: 'strobe', default_solid: 0, default_strobe: 250 },
    { type: 'other', default: 0 },
  ],
}

const derbyFixture: FixtureType = {
  id: '4',
  manufacturer: 'Laluce Natz',
  name: 'Derby',
  epicness: 0,
  channels: [
    { type: 'master' },
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'strobe', default_solid: 0, default_strobe: 199 },
    { type: 'other', default: 130 },
    { type: 'other', default: 0 },
  ],
}

const laserFixture: FixtureType = {
  id: '5',
  manufacturer: 'Laser World',
  name: 'EL-400',
  epicness: 0.5,
  channels: [{ type: 'master' }],
}

const vBar: FixtureType = {
  id: '6',
  manufacturer: 'American DJ',
  name: 'VBar',
  epicness: 0.7,
  channels: [
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'color', color: 'red' },
    { type: 'master' },
    { type: 'strobe', default_solid: 0, default_strobe: 218 },
    { type: 'other', default: 0 },
  ],
}

const venuePar: FixtureType = {
  id: '7',
  manufacturer: 'Venue',
  name: 'ThinTri 64',
  epicness: 0.7,
  channels: [
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'other', default: 0 },
    { type: 'strobe', default_solid: 0, default_strobe: 247 },
    { type: 'other', default: 0 },
    { type: 'master' },
    { type: 'other', default: 0 },
  ],
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: 'Name',
    manufacturer: 'Manufacturer',
    epicness: 0,
    channels: [],
  }
}

export const fixtureTypes = ['1', '2', '3', '4', '5', '6', '7']

export const fixtureTypesByID = {
  '1': parFixture,
  '2': stringLightFixture,
  '3': strobeFixture,
  '4': derbyFixture,
  '5': laserFixture,
  '6': vBar,
  '7': venuePar,
}

export interface Fixture {
  ch: number
  type: string // FixtureType id
  window: Window2D_t
  group: string
}

export type Universe = Fixture[]

export function getTestUniverse(): Universe {
  return [
    {
      ch: 1,
      type: '4',
      window: { x: { pos: 0.5, width: 0.0 }, y: { pos: 0.6, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 8,
      type: '3',
      window: { x: { pos: 0.5, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    // { ch: 11, type: '2', window: {x: {pos: 0.0, width: 0.0}}, group: DEFAULT_GROUP },
    // { ch: 12, type: '2', window: {x: {pos: 0.33, width: 0.0}}, group: DEFAULT_GROUP },
    // { ch: 13, type: '2', window: {x: {pos: 0.66, width: 0.0}}, group: DEFAULT_GROUP },
    // { ch: 14, type: '2', window: {x: {pos: 1.0, width: 0.0}}, group: DEFAULT_GROUP },
    {
      ch: 15,
      type: '1',
      window: { x: { pos: 0.15, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 23,
      type: '1',
      window: { x: { pos: 0.3, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 31,
      type: '1',
      window: { x: { pos: 0.7, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 39,
      type: '1',
      window: { x: { pos: 0.86, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 47,
      type: '6',
      window: { x: { pos: 0.0, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 54,
      type: '6',
      window: { x: { pos: 1.0, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 61,
      type: '7',
      window: { x: { pos: 0.0, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    {
      ch: 69,
      type: '7',
      window: { x: { pos: 1.0, width: 0.0 } },
      group: DEFAULT_GROUP,
    },
    // { ch: 128, type: '5', window: {}, group: DEFAULT_GROUP }
  ]
}

export function getSortedGroups(universe: Universe) {
  const groupSet: Set<string> = new Set()
  for (const fixture of universe) {
    groupSet.add(fixture.group)
  }
  return Array.from(groupSet.keys()).sort((a, b) => (a > b ? 1 : -1))
}
