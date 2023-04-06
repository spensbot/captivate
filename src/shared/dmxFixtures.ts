import { Window2D_t } from '../shared/window'
import { ColorChannel } from './dmxColors'
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
  color: ColorChannel
}

type ChannelStrobe = {
  type: 'strobe'
  default_strobe: DmxValue
  default_solid: DmxValue
}

export type ChannelAxis = {
  type: 'axis'
  dir: AxisDir
  isFine: boolean
  min: DmxValue
  max: DmxValue
}

export type ColorMapColor = { max: number; hue: number; saturation: number }

export type ChannelColorMap = {
  type: 'colorMap'
  colors: ColorMapColor[]
}

export type ChannelCustom = {
  type: 'custom'
  name: string
  default: DmxValue

  isControllable: boolean
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
  | ChannelCustom

export type ChannelType = FixtureChannel['type']

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'colorMap',
  'strobe',
  'axis',
  'custom',
]

export function initFixtureChannel(
  type?: FixtureChannel['type']
): FixtureChannel {
  if (type === 'color') {
    initChannelColor(0, 1)
  } else if (type === 'strobe') {
    return initChannelStrobe()
  } else if (type === 'axis') {
    return initChannelAxis('x', false)
  } else if (type === 'colorMap') {
    return initChannelColorMap([{ max: 0, hue: 0, saturation: 1.0 }])
  } else if (type === 'custom') {
    return initChannelCustom('Custom')
  }
  return initChannelMaster()
}

export function initChannelColorMap(colors: ColorMapColor[]): ChannelColorMap {
  return {
    type: 'colorMap',
    colors,
  }
}

export function initChannelStrobe(): ChannelStrobe {
  return {
    type: 'strobe',
    default_solid: DMX_MIN_VALUE,
    default_strobe: DMX_MAX_VALUE,
  }
}

export function initChannelAxis(dir: AxisDir, isFine: boolean): ChannelAxis {
  return {
    type: 'axis',
    dir,
    isFine,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

export function initChannelColor(
  hue: number,
  saturation: number
): ChannelColor {
  return {
    type: 'color',
    color: {
      hue,
      saturation,
    },
  }
}

export function initChannelMaster(): ChannelMaster {
  return {
    type: 'master',
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
    isOnOff: false,
  }
}

export function initChannelCustom(name: string): ChannelCustom {
  return {
    type: 'custom',
    name,
    default: DMX_MIN_VALUE,
    isControllable: false,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

export type FixtureType = {
  id: string
  name: string
  intensity: number
  manufacturer?: string
  channels: FixtureChannel[]
  subFixtures: SubFixture[]
  groups: string[]
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: 'Name',
    manufacturer: 'Manufacturer',
    intensity: 0,
    channels: [initFixtureChannel()],
    subFixtures: [],
    groups: [],
  }
}

export interface Fixture {
  ch: number
  type: string // FixtureType id
  window: Window2D_t
  groups: string[]
}

export type Universe = Fixture[]

export type SubFixture = {
  name: string
  intensity?: number
  channels: number[] // Channel indexes from the parent fixture
  relative_window?: Window2D_t
  groups: string[]
}

export function initSubFixture(): SubFixture {
  return {
    name: 'Name',
    channels: [],
    groups: [],
  }
}

export type FlattenedFixture = {
  intensity: number
  channels: [number, FixtureChannel][]
  window: Window2D_t
  groups: string[]
}
