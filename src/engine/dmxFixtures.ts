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
  manufacturer?: String
  name?: String
  channels: FixtureChannel[]
}

const parFixture : FixtureType = {
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
  channels: [
    { type: ChannelType.Master },
  ]
}

const strobeFixture : FixtureType = {
  channels: [
    { type: ChannelType.Master },
    { type: ChannelType.StrobeSpeed, default_solid: 0, default_strobe: 251 },
    { type: ChannelType.Other, default: 0 },
  ]
}

const derbyFixture : FixtureType = {
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

type Universe = Fixture[]

export const universe : Universe = [
  {channelNum: 1, type: stringLightFixture, window: {x: {pos: 0.0, width: 0.0}} },
  {channelNum: 2, type: stringLightFixture, window: {x: {pos: 0.33, width: 0.0}} },
  {channelNum: 3, type: stringLightFixture, window: {x: {pos: 0.66, width: 0.0}} },
  {channelNum: 4, type: stringLightFixture, window: {x: {pos: 1.0, width: 0.0}} },
  {channelNum: 5, type: parFixture },
  {channelNum: 12, type: parFixture },
  {channelNum: 19, type: strobeFixture },
  {channelNum: 22, type: derbyFixture },
]
