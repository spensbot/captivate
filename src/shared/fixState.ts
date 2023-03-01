import { DeviceState } from 'renderer/redux/deviceState'
import { DmxState } from 'renderer/redux/dmxSlice'
import { CleanReduxState } from '../renderer/redux/store'
import { ColorChannel } from './dmxColors'
import { DmxValue, FixtureChannel } from './dmxFixtures'
import { Modulator } from './modulation'
import { Modulation, Params } from './params'
import { RandomizerOptions } from './randomizer'
import {
  LightScenes_t,
  LightScene_t,
  SplitScene_t,
  VisualScenes_t,
} from './Scenes'

type Deprecated_ChannelMode = {
  type: 'mode'
  min: DmxValue
  max: DmxValue
}

interface Deprecated_LightScene_t extends LightScene_t {
  baseParams?: Params
  randomizer?: RandomizerOptions
}

interface Deprecated_Modulator extends Modulator {
  modulation?: Modulation
}

type Deprecated_Color = 'red' | 'green' | 'blue' | 'white' | ColorChannel

// Modify this function to fix any breaking state changes between upgrades
export default function fixState(state: CleanReduxState): CleanReduxState {
  fixLightScenes(state.control.light)
  fixVisualScenes(state.control.visual)
  fixDmxState(state.dmx)
  fixDeviceState(state.control.device)

  return state
}

export function fixLightScenes(light: LightScenes_t) {
  // Move deprecated main scene to split scenes
  for (const lightScene of lightScenes(light)) {
    const _lightScene = lightScene as Deprecated_LightScene_t
    if (
      _lightScene.baseParams !== undefined &&
      _lightScene.randomizer !== undefined
    ) {
      const oldMainScene: SplitScene_t = {
        baseParams: _lightScene.baseParams,
        randomizer: _lightScene.randomizer,
        groups: {},
      }
      delete _lightScene.baseParams
      delete _lightScene.randomizer
      lightScene.splitScenes.unshift(oldMainScene)
    }
  }

  for (const modulator of modulators(light)) {
    const _modulator = modulator as Deprecated_Modulator
    if (_modulator.modulation !== undefined) {
      modulator.splitModulations.unshift(_modulator.modulation)
      delete _modulator.modulation
    }
  }

  for (const split of splits(light)) {
    if (Array.isArray(split.groups)) {
      const groups = split.groups as string[]
      split.groups = {}
      for (const group of groups) {
        split.groups[group] = true
      }
    }
  }
}

export function fixVisualScenes(_visualScenes: VisualScenes_t) {}

export function fixDmxState(dmx: DmxState) {
  // Swtich old mode channels to new custom channel
  for (const fixture of fixtureTypes(dmx)) {
    for (let i = 0; i < fixture.channels.length; i++) {
      let channel = fixture.channels[i] as
        | FixtureChannel
        | Deprecated_ChannelMode

      if (channel.type === 'mode') {
        const newChannel: FixtureChannel = {
          type: 'custom',
          name: 'mode',
          default: 0,
          min: channel.min,
          max: channel.max,
        }
        fixture.channels[i] = newChannel
      }
    }
  }

  // Add subfixtures to all fixtures
  for (const fixture of fixtureTypes(dmx)) {
    if (fixture.subFixtures === undefined) {
      fixture.subFixtures = []
    }
  }

  // Add groups
  for (const fixtureType of fixtureTypes(dmx)) {
    if (!Array.isArray(fixtureType.groups)) {
      fixtureType.groups = []
    }
  }
  for (const fixture of dmx.universe) {
    if (!Array.isArray(fixture.groups)) {
      fixture.groups = []
    }
  }

  // Change to new ColorChannels
  for (const channel of channels(dmx)) {
    if (channel.type === 'color') {
      const c = channel.color as Deprecated_Color
      if (c === 'red') {
        channel.color = {
          hue: 0.0,
          saturation: 1.0,
        }
      } else if (c === 'green') {
        channel.color = {
          hue: 0.333,
          saturation: 1.0,
        }
      } else if (c === 'blue') {
        channel.color = {
          hue: 0.666,
          saturation: 1.0,
        }
      } else if (c === 'white') {
        channel.color = {
          hue: 0.0,
          saturation: 0.0,
        }
      }
    } else if (channel.type === 'colorMap') {
      for (const color of channel.colors) {
        if (color.saturation === undefined) {
          color.saturation = 1.0
        }
      }
    }
  }
}

export function fixDeviceState(_deviceState: DeviceState) {}

function fixtureTypes(dmx: DmxState) {
  return dmx.fixtureTypes.map((id) => dmx.fixtureTypesByID[id])
}
//@ts-ignore
function channels(dmx: DmxState) {
  return fixtureTypes(dmx)
    .map((ft) => ft.channels)
    .flat()
}
function lightScenes(light: LightScenes_t) {
  return light.ids.map((id) => light.byId[id])
}
//@ts-ignore
function visualScenes(visual: VisualScenes_t) {
  return visual.ids.map((id) => visual.byId[id])
}
//@ts-ignore
function modulators(light: LightScenes_t) {
  return lightScenes(light)
    .map((scene) => scene.modulators)
    .flat()
}
//@ts-ignore
function splits(light: LightScenes_t) {
  return lightScenes(light)
    .map((scene) => scene.splitScenes)
    .flat()
}
