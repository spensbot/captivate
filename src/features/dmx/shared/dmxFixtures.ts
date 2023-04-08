import { Pretty } from 'features/shared/shared/type-utils'
import { Window2D_t } from '../../shared/shared/window'
import { ColorChannel } from './dmxColors'
import { nanoid } from 'nanoid'
import { channelConfig } from '../channel.config'

export const DMX_MIN_VALUE = 0
export const DMX_MAX_VALUE = 255
export const DMX_NUM_CHANNELS = 512
export const DMX_DEFAULT_VALUE = 0

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export type AxisDir = 'x' | 'y'
export const axisDirList = ['x', 'y']

export type ColorMapColor = { max: number; hue: number; saturation: number }

export type FixtureApi = {
  custom: {
    name: string
    default: DmxValue
    isControllable: boolean
    min: DmxValue
    max: DmxValue
  }
  colorMap: { colors: ColorMapColor[] }
  axis: { dir: AxisDir; isFine: boolean; min: DmxValue; max: DmxValue }
  strobe: { default_strobe: DmxValue; default_solid: DmxValue }
  color: { color: ColorChannel }
  master: { min: DmxValue; max: DmxValue; isOnOff: boolean }
}

export type ChannelType = keyof FixtureApi

type ConvertApiToPayload = {
  [k in ChannelType]: Pretty<FixtureApi[k] & { type: k }>
}[ChannelType]

export type GetFixturePayload<Type extends ChannelType> = Extract<
  ConvertApiToPayload,
  { type: Type }
>

export const defaultCustomChannels = ['speed']

export type FixtureChannel = ConvertApiToPayload

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'strobe',
  'axis',
  'colorMap',
  'custom',
]

export function initFixtureChannel(
  type?: FixtureChannel['type']
): FixtureChannel {
  if (!type) return channelConfig.master.default()
  return channelConfig[type].default()
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
