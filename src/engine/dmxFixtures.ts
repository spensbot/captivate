import { Window2D } from './baseTypes'
import { Color } from './dmxColors'

export const DMX_MAX_VALUE = 255;
export const DMX_NUM_CHANNELS = 512;
export const DMX_DEFAULT_VALUE = 0;

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export enum ChannelType {
  Color,
  Master,
  StrobeSpeed,
  Other,
}

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
  manufacturer?: string
  name?: string
  channels: FixtureChannel[]
}

const parFixture : FixtureType = {
  id: "1",
  manufacturer: "Laluce Natz",
  name: "Par",
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.Color, color: Color.Red },
    { type: ChannelType.Color, color: Color.Green },
    { type: ChannelType.Color, color: Color.Blue },
    { type: ChannelType.Color, color: Color.White },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 125 },
    { type: ChannelType.Other, default: 0 },
    { type: ChannelType.Other, default: 0 },
  ]
}

const stringLightFixture : FixtureType = {
  id: '2',
  channels: [
    { type: ChannelType.Master },
  ]
}

const strobeFixture : FixtureType = {
  id: '3',
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 251 },
    { type: ChannelType.Other, default: 0 },
  ]
}

const derbyFixture : FixtureType = {
  id: '4',
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.Color, color: Color.Red },
    { type: ChannelType.Color, color: Color.Green },
    { type: ChannelType.Color, color: Color.Blue },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 251 },
    { type: ChannelType.Other, default: 0 },
    { type: ChannelType.Other, default: 0 },
  ]
}

export type Fixture = {
  channelNum: DmxChannel,
  type: FixtureType,
  window?: Window2D
}

export const testFixtureTypes = {
  1: parFixture,
  2: stringLightFixture,
  3: strobeFixture,
  4: derbyFixture
}

export const testUniverse = {
  1: {channelNum: 1, type: stringLightFixture, window: {x: {pos: 0.0, width: 0.0}} },
  2: {channelNum: 2, type: stringLightFixture, window: {x: {pos: 0.33, width: 0.0}} },
  3: {channelNum: 3, type: stringLightFixture, window: {x: {pos: 0.66, width: 0.0}} },
  4: {channelNum: 4, type: stringLightFixture, window: {x: {pos: 1.0, width: 0.0}} },
  5: {channelNum: 5, type: parFixture },
  13: {channelNum: 13, type: parFixture },
  21: {channelNum: 21, type: strobeFixture },
  24: {channelNum: 24, type: derbyFixture },
}
