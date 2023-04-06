import { QlcChannel } from './qlc_channel'

enum QlcFixtureType {
  ColorChanger = 0,
  Dimmer,
  Effect,
  Fan,
  Flower,
  Hazer,
  Laser,
  LEDBarBeams,
  LEDBarPixels,
  MovingHead,
  Other,
  Scanner,
  Smoke,
  Strobe,
}

// see qlcfixturedef.h -> https://github.com/mcallegari/qlcplus/blob/master/engine/src/qlcfixturedef.h
export interface QlcFixtureDef {
  Manufacturer: string
  Model: string
  Type: QlcFixtureType
  // All of its QLCChannel entries in a non-ordered pool
  Channel: QlcChannel[] | QlcChannel
  // Each QLCFixtureMode picks their channels from this channel pool and arranges
  // them in such an order that represents each mode
  Mode: QlcFixtureMode[] | QlcFixtureMode
  Physical: QlcPhysical
}

export interface QlcFixtureMode {
  '@_Name': string
  Channel: QlcFixtureModeChannel[] | QlcFixtureModeChannel
}

export interface QlcFixtureModeChannel {
  '#text': string // @_Name of QlcChannel
}

export interface QlcPhysical {
  bulbType: string
  bulbLumens: number
  bulbColourTemperature: number
  weight: number
  width: number
  height: number
  depth: number
  lensName: string
  lensDegreesMin: number
  lensDegreesMax: number
  focusType: string
  focusPanMax: number
  focusTiltMax: number
  powerConsumption: number
  dmxConnector: string
}
