import { Window2D_t } from '../shared/window'
import { Color } from './dmxColors'
import { nanoid } from 'nanoid'

export const DMX_MIN_VALUE = 0
export const DMX_MAX_VALUE = 255
export const DMX_NUM_CHANNELS = 512
export const DMX_DEFAULT_VALUE = 0

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export type AxisDir = 'x' | 'y'
export const axisDirList = ['x', 'y']

type ChannelMaster = {
  type: 'master'
  min: DmxValue
  max: DmxValue
  isOnOff: boolean
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

export type ChannelAxis = {
  type: 'axis'
  dir: AxisDir
  isFine: boolean
  min: DmxValue
  max: DmxValue
}

export type ColorMapColor = { max: number; hue: number }

type ChannelColorMap = {
  type: 'colorMap'
  colors: ColorMapColor[]
}

type ChannelReset = {
  type: 'reset'
  resetVal: DmxValue
}

export type ChannelCustom = {
  type: 'custom'
  name: string
  default: DmxValue
  min: DmxValue
  max: DmxValue
}

export const defaultCustomChannels = ['speed']

export type FixtureChannel =
  | ChannelMaster
  | ChannelColor
  | ChannelStrobe
  | ChannelAxis
  | ChannelColorMap
  | ChannelOther
  | ChannelReset
  | ChannelCustom

export type ChannelType = FixtureChannel['type']

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'strobe',
  'axis',
  'colorMap',
  'other',
  'reset',
  'custom',
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
      default: DMX_MIN_VALUE,
    }
  } else if (type === 'strobe') {
    return {
      type: type,
      default_solid: DMX_MIN_VALUE,
      default_strobe: DMX_MAX_VALUE,
    }
  } else if (type === 'axis') {
    return {
      type: type,
      dir: 'x',
      isFine: false,
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
    }
  } else if (type === 'colorMap') {
    return {
      type: type,
      colors: [],
    }
  } else if (type === 'reset') {
    return {
      type: 'reset',
      resetVal: DMX_MAX_VALUE,
    }
  } else if (type === 'custom') {
    return {
      type: 'custom',
      name: 'custom',
      default: DMX_MIN_VALUE,
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
    }
  }
  return {
    type: 'master',
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
    isOnOff: false,
  }
}

export type FixtureType = {
  id: string
  name: string
  intensity: number
  manufacturer?: string
  channels: FixtureChannel[]
  subFixtures: SubFixture[]
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: 'Name',
    manufacturer: 'Manufacturer',
    intensity: 0,
    channels: [],
    subFixtures: [],
  }
}

export interface Fixture {
  ch: number
  type: string // FixtureType id
  window: Window2D_t
  group: string
}

export type Universe = Fixture[]

export type SubFixture = {
  name: string
  intensity?: number
  channels: number[] // Channel indexes from the parent fixture
  relative_window?: Window2D_t
}

export function initSubFixture(): SubFixture {
  return {
    name: 'Name',
    channels: [],
  }
}

export type FlattenedFixture = {
  intensity: number
  channels: [number, FixtureChannel][]
  window: Window2D_t
  groups: string[]
}
