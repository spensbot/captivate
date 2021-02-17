import { Window2D } from '../types/baseTypes'
import { Color } from './dmxColors'
import { nanoid } from 'nanoid'
import Universe from '../components/pages/Universe';

export const DMX_MAX_VALUE = 255;
export const DMX_NUM_CHANNELS = 512;
export const DMX_DEFAULT_VALUE = 0;

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export enum ChannelType {
  Color = 'color',
  Master = 'master',
  StrobeSpeed = 'strobe speed',
  Other = 'constant',
}

export const channelTypes = [
  ChannelType.Master,
  ChannelType.Color,
  ChannelType.StrobeSpeed,
  ChannelType.Other
]

type ChannelMaster = {
  type: ChannelType.Master
}

type ChannelColor = {
  type: ChannelType.Color
  color: Color
}

type ChannelStrobe = {
  type: ChannelType.StrobeSpeed
  default_strobe: DmxValue
  default_solid: DmxValue
}

type ChannelOther = {
  type: ChannelType.Other
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

const parFixture : FixtureType = {
  id: "1",
  manufacturer: "YeeSaw",
  name: "Par",
  epicness: 0.3,
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.Color, color: Color.Red },
    { type: ChannelType.Color, color: Color.Green },
    { type: ChannelType.Color, color: Color.Blue },
    { type: ChannelType.Color, color: Color.White },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 125 },
    { type: ChannelType.Other, default: 0 },
    { type: ChannelType.Other, default: 0 }
  ]
}

const stringLightFixture : FixtureType = {
  id: '2',
  name: "Light String",
  epicness: 0.3,
  channels: [
    { type: ChannelType.Master },
  ]
}

const strobeFixture : FixtureType = {
  id: '3',
  manufacturer: "DragonX",
  name: "Strobe",
  epicness: 0.8,
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 251 },
    { type: ChannelType.Other, default: 0 },
  ]
}

const derbyFixture : FixtureType = {
  id: '4',
  manufacturer: "Laluce Natz",
  name: "Derby",
  epicness: 0,
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.Color, color: Color.Red },
    { type: ChannelType.Color, color: Color.Green },
    { type: ChannelType.Color, color: Color.Blue },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 251 },
    { type: ChannelType.Other, default: 130 },
    { type: ChannelType.Other, default: 0 },
  ]
}

const laserFixture: FixtureType = {
  id: '5',
  manufacturer: 'Laser World',
  name: 'EL-400',
  epicness: 0.5,
  channels: [
    { type: ChannelType.Master }
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
  type: string, // FixtureType id
  window?: Window2D
}

export type Universe = Fixture[]

export function getTestUniverse(): Universe {
  return [
    // { ch: 1, type: '4', window: {x: {pos: 0.5, width: 0.0}} },
    { ch: 8, type: '3', window: {x: {pos: 0.5, width: 0.0}} },
    { ch: 11, type: '2', window: {x: {pos: 0.0, width: 0.0}} },
    { ch: 12, type: '2', window: {x: {pos: 0.33, width: 0.0}} },
    { ch: 13, type: '2', window: {x: {pos: 0.66, width: 0.0}} },
    { ch: 14, type: '2', window: {x: {pos: 1.0, width: 0.0}} },
    { ch: 15, type: '1', window: {x: {pos: 0.8333, width: 0.0}} },
    { ch: 23, type: '1', window: { x: { pos: 0.1666, width: 0.0 } } },
    { ch: 35, type: '5', window: {}}
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

// export function getSlots_old(universe: Universe): Slot_t[] {
//   const slots: Slot_t[] = []
//   const universeMap = getUniverseMap(universe)
//   universeMap.forEach((maybeFixture, index) => {
//     if (maybeFixture !== null) {
//       slots.push({
//         kind: 'fixture',
//         fixture: maybeFixture
//       })
//     } else {
//       const lastSlot = slots[slots.length - 1]
//       if (lastSlot.kind === 'gap') {
//         lastSlot.count += 1
//       } else {
//         slots.push({
//           kind: 'gap',
//           count: 1,
//           ch: index + 1
//         })
//       }
//     }
//   });

//   return slots
// }