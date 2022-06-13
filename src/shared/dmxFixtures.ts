import { Window2D_t } from '../shared/window'
import { Color } from './dmxColors'
import { nanoid } from 'nanoid'

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

type ChannelAxis = {
  type: 'axis'
  dir: AxisDir
  min: DmxValue
  max: DmxValue
}

type ChannelMode = {
  type: 'mode'
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

export type FixtureChannel =
  | ChannelMaster
  | ChannelColor
  | ChannelStrobe
  | ChannelAxis
  | ChannelColorMap
  | ChannelOther
  | ChannelReset
  | ChannelMode

export type ChannelType = FixtureChannel['type']

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'strobe',
  'axis',
  'colorMap',
  'other',
  'mode',
  'reset',
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
  } else if (type === 'mode') {
    return {
      type: type,
      min: 0,
      max: 255,
    }
  } else if (type === 'reset') {
    return {
      type: 'reset',
      resetVal: 255,
    }
  }
  return {
    type: 'master',
    min: 0,
    max: 255,
    isOnOff: false,
  }
}

export type FixtureType = {
  id: string
  name: string
  intensity: number
  manufacturer?: string
  channels: FixtureChannel[]
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: 'Name',
    manufacturer: 'Manufacturer',
    intensity: 0,
    channels: [],
  }
}

export interface Fixture {
  ch: number
  type: string // FixtureType id
  window: Window2D_t
  group: string
}

export type Universe = Fixture[]
