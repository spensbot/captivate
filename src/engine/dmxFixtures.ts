import { Window, Window2D_t } from '../types/baseTypes'
import { Color } from './dmxColors'
import { nanoid } from 'nanoid'
import { string, number, union, object, boolean, array, equal } from '../util/validate'

export const DMX_MAX_VALUE = 255;
export const DMX_NUM_CHANNELS = 512;
export const DMX_DEFAULT_VALUE = 0;

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export type ChannelType = 'color' | 'master' | 'strobe' | 'speed' | 'pos' | 'width' | 'other'

export const channelTypes = [ 'master', 'color', 'strobe', 'other', 'speed', 'pos', 'width', 'other' ]

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

// type ChannelSpeed = {
//   type: ChannelType.Speed
// }

// type ChannelPos = {
//   type: ChannelType.Pos,
//   dim: 'x' | 'y'
// }

// type ChannelWidth = {
//   type: ChannelType.Width,
//   dim: 'x' | 'y'
// }

type ChannelOther = {
  type: 'other'
  default: DmxValue
}

export type FixtureChannel = ChannelMaster | ChannelColor | ChannelStrobe | ChannelOther

export type FixtureType = {
  id: string
  name: string
  epicness: number
  manufacturer?: string
  channels: FixtureChannel[]
}

const windowSchema = object<Window>({
  pos: number(),
  width: number()
})

const window2DSchema = object<Window2D_t>({
  x: windowSchema,
  y: windowSchema
})

export const fixtureSchema = object<Fixture>({
  ch: number(),
  type: string(),
  window: window2DSchema,
  groups: array(string())
})

export const fixtureTypeSchema = object<FixtureType>({
  id: string(),
  name: string(),
  epicness: number(),
  manufacturer: string(),
  channels: array(union(
    object<ChannelMaster>({ type: equal('master') }),
    object<ChannelColor>({ type: equal('color'), color: union('red', 'green', 'blue', 'white', 'black') }),
    object<ChannelStrobe>({ type: equal('strobe'), default_strobe: number(), default_solid: number() }),
    object<ChannelOther>({ type: equal('other'), default: number() })
  ))
})


const parFixture : FixtureType = {
  id: "1",
  manufacturer: "YeeSaw",
  name: "Par",
  epicness: 0.3,
  channels: [
    { type: 'master' },
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'color', color: 'white' },
    { type: 'other', default: 0 },
    { type: 'strobe', default_solid: 0, default_strobe: 255 },
    { type: 'other', default: 0 }
  ]
}

const stringLightFixture : FixtureType = {
  id: '2',
  name: "Light String",
  epicness: 0.3,
  channels: [
    { type: 'master' },
  ]
}

const strobeFixture : FixtureType = {
  id: '3',
  manufacturer: "DragonX",
  name: "Strobe",
  epicness: 0.8,
  channels: [
    { type: 'master' },
    { type: 'strobe', default_solid: 0, default_strobe: 251 },
    { type: 'other', default: 0 },
  ]
}

const derbyFixture : FixtureType = {
  id: '4',
  manufacturer: "Laluce Natz",
  name: "Derby",
  epicness: 0,
  channels: [
    { type: 'master' },
    { type: 'color', color: 'red' },
    { type: 'color', color: 'green' },
    { type: 'color', color: 'blue' },
    { type: 'strobe', default_solid: 0, default_strobe: 220 },
    { type: 'other', default: 130 },
    { type: 'other', default: 0 },
  ]
}

const laserFixture: FixtureType = {
  id: '5',
  manufacturer: 'Laser World',
  name: 'EL-400',
  epicness: 0.5,
  channels: [
    { type: 'master' }
  ]
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: '',
    epicness: 0,
    channels: []
  }
} 

export const fixtureTypes = [
  '1',
  '2',
  '3',
  '4',
  '5'
]

export const fixtureTypesByID = {
  '1': parFixture,
  '2': stringLightFixture,
  '3': strobeFixture,
  '4': derbyFixture,
  '5': laserFixture
}

export interface Fixture {
  ch: number
  type: string // FixtureType id
  window: Window2D_t
  groups: string[] 
}

export type Universe = Fixture[]

export function getTestUniverse(): Universe {
  return [
    { ch: 1, type: '4', window: {x: {pos: 0.5, width: 0.0}, y: {pos: 0.6, width: 0.0}}, groups: [] },
    { ch: 8, type: '3', window: {x: {pos: 0.5, width: 0.0}}, groups: [] },
    { ch: 11, type: '2', window: {x: {pos: 0.0, width: 0.0}}, groups: [] },
    { ch: 12, type: '2', window: {x: {pos: 0.33, width: 0.0}}, groups: [] },
    { ch: 13, type: '2', window: {x: {pos: 0.66, width: 0.0}}, groups: [] },
    { ch: 14, type: '2', window: {x: {pos: 1.0, width: 0.0}}, groups: [] },
    { ch: 15, type: '1', window: {x: {pos: 0.8333, width: 0.0}}, groups: [] },
    { ch: 23, type: '1', window: {x: { pos: 0.1666, width: 0.0 }}, groups: [] },
    { ch: 35, type: '5', window: {}, groups: [] }
  ]
}

type UniverseMap = (Fixture | null)[]

function initUniverseMap(): UniverseMap {
  return Array(512).fill(null)
}

function getUniverseMap(universe: Universe): UniverseMap {
  const universeMap = initUniverseMap()

  universe.forEach(fixture => {
    universeMap[fixture.ch - 1] = fixture
  })

  return universeMap
}