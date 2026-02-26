import {
  DeviceState,
  MidiAction,
  SliderControlOptions,
  normalizeSliderOptionsForAction,
} from 'renderer/redux/deviceState'
import { DmxState } from 'renderer/redux/dmxSlice'
import { initLedState } from 'renderer/redux/ledState'
import { CleanReduxState } from '../renderer/redux/store'
import { MixerState } from 'renderer/redux/mixerSlice'
import { ColorChannel, inferColorKind } from './dmxColors'
import {
  DmxValue,
  FixtureChannel,
  initChannelCustom,
  DMX_MAX_UNIVERSES,
} from './dmxFixtures'
import { Modulator } from './modulation'
import { normalizeLfoShape } from './oscillator'
import { Modulation, Params } from './params'
import { RandomizerOptions } from './randomizer'
import {
  LightScenes_t,
  LightScene_t,
  SplitScene_t,
  VisualScenes_t,
} from './Scenes'

type Deprecated_ChannelOther = {
  type: 'other'
  default: DmxValue
}

type Deprecated_ChannelReset = {
  type: 'reset'
  resetVal: DmxValue
}

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

function clampUniverse(value: number, maxUniverse: number = DMX_MAX_UNIVERSES) {
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(1, Math.round(value)), maxUniverse)
}

// Modify this function to fix any breaking state changes between upgrades
export default function fixState(state: CleanReduxState): CleanReduxState {
  fixLightScenes(state.control.light)
  fixVisualScenes(state.control.visual)
  fixDmxState(state.dmx)
  fixDeviceState(state.control.device)
  fixMixerState(state.mixer)

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

    const lfo = modulator.lfo as {
      shape?: unknown
      skew?: number
      symmetricSkew?: number
      phaseShift?: number
      flip?: number
      period?: number
    }

    modulator.lfo.shape = normalizeLfoShape(lfo.shape)

    if (!Number.isFinite(lfo.skew)) {
      modulator.lfo.skew = 0.5
    }
    if (!Number.isFinite(lfo.symmetricSkew)) {
      modulator.lfo.symmetricSkew = 0.5
    }
    if (!Number.isFinite(lfo.phaseShift)) {
      modulator.lfo.phaseShift = 0.0
    }
    if (!Number.isFinite(lfo.flip)) {
      modulator.lfo.flip = 0.0
    }

    modulator.lfo.skew = Math.min(1, Math.max(0, modulator.lfo.skew))
    modulator.lfo.symmetricSkew = Math.min(
      1,
      Math.max(0, modulator.lfo.symmetricSkew)
    )
    modulator.lfo.phaseShift = Math.min(1, Math.max(0, modulator.lfo.phaseShift))
    modulator.lfo.flip = Math.min(1, Math.max(0, modulator.lfo.flip))

    if (!Number.isFinite(lfo.period) || (lfo.period ?? 0) <= 0) {
      modulator.lfo.period = 4
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

  for (const split of splits(light)) {
    const sat = split.baseParams.saturation ?? 1

    if (split.baseParams.white === undefined) {
      split.baseParams.white = Math.min(1, Math.max(0, 1 - sat))
    }
    if (split.baseParams.warmWhite === undefined) {
      split.baseParams.warmWhite = 0
    }
    if (split.baseParams.amber === undefined) {
      split.baseParams.amber = 0
    }
    if (split.baseParams.uv === undefined) {
      split.baseParams.uv = 0
    }

    if (split.baseParams.strobeRgb === undefined) {
      split.baseParams.strobeRgb = 1
    }
    if (split.baseParams.strobeWhite === undefined) {
      split.baseParams.strobeWhite = 1
    }
    if (split.baseParams.strobeWarmWhite === undefined) {
      split.baseParams.strobeWarmWhite = 1
    }
    if (split.baseParams.strobeAmber === undefined) {
      split.baseParams.strobeAmber = 1
    }
    if (split.baseParams.strobeUv === undefined) {
      split.baseParams.strobeUv = 1
    }
  }
  // Keep modulator split-mapping aligned with the number of split scenes.
  for (const lightScene of lightScenes(light)) {
    const splitCount = lightScene.splitScenes.length

    for (const modulator of lightScene.modulators) {
      while (modulator.splitModulations.length < splitCount) {
        modulator.splitModulations.push({})
      }

      if (modulator.splitModulations.length > splitCount) {
        modulator.splitModulations = modulator.splitModulations.slice(
          0,
          splitCount
        )
      }

      for (let i = 0; i < splitCount; i++) {
        if (
          modulator.splitModulations[i] === undefined ||
          modulator.splitModulations[i] === null
        ) {
          modulator.splitModulations[i] = {}
        }
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
        | Deprecated_ChannelOther
        | Deprecated_ChannelReset

      if (channel.type === 'mode') {
        const newChannel: FixtureChannel = {
          type: 'custom',
          name: 'mode',
          default: 0,
          isControllable: false,
          min: channel.min,
          max: channel.max,
        }
        fixture.channels[i] = newChannel
      } else if (channel.type === 'other') {
        const newChannel = initChannelCustom('Other')
        newChannel.default = channel.default
        fixture.channels[i] = newChannel
      } else if (channel.type === 'reset') {
        const newChannel = initChannelCustom('Reset')
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
  for (const fixture of dmx.universe as (typeof dmx.universe[number] & {
    universe?: number
  })[]) {
    if (!Array.isArray(fixture.groups)) {
      fixture.groups = []
    }
    if (fixture.universe === undefined) {
      fixture.universe = 1
    }
    fixture.universe = clampUniverse(fixture.universe)
  }

  if ((dmx as DmxState & { activeUniverse?: number }).activeUniverse === undefined) {
    ;(dmx as DmxState & { activeUniverse?: number }).activeUniverse = 1
  }

  dmx.activeUniverse = clampUniverse(
    (dmx as DmxState & { activeUniverse?: number }).activeUniverse ?? 1
  )

  dmx.universe.sort((left, right) => {
    if (left.universe === right.universe) {
      return left.ch - right.ch
    }
    return left.universe - right.universe
  })

  if (
    dmx.activeFixture !== null &&
    dmx.universe[dmx.activeFixture]?.universe !== dmx.activeUniverse
  ) {
    dmx.activeFixture = null
  }

  // Change to new ColorChannels
  for (const channel of channels(dmx)) {
    if (channel.type === 'color') {
      const c = channel.color as Deprecated_Color
      if (c === 'red') {
        channel.color = {
          hue: 0.0,
          saturation: 1.0,
          kind: 'color',
        }
      } else if (c === 'green') {
        channel.color = {
          hue: 0.333,
          saturation: 1.0,
          kind: 'color',
        }
      } else if (c === 'blue') {
        channel.color = {
          hue: 0.666,
          saturation: 1.0,
          kind: 'color',
        }
      } else if (c === 'white') {
        channel.color = {
          hue: 0.0,
          saturation: 0.0,
          kind: 'white',
        }
      } else if (c.kind === undefined) {
        channel.color.kind = inferColorKind(c)
      }
    } else if (channel.type === 'colorMap') {
      for (const color of channel.colors) {
        if (color.saturation === undefined) {
          color.saturation = 1.0
        }
        if (color.kind === undefined) {
          color.kind = inferColorKind(color)
        }
      }
    }
  }

  // Add Led State
  if (dmx.led === undefined) {
    dmx.led = initLedState()
  }
}

export function fixDeviceState(deviceState: DeviceState) {
  // Add ArtNet
  if (deviceState.connectable.artNet === undefined) {
    deviceState.connectable.artNet = []
  }

  // Add ConnectionSettings
  if (deviceState.connectionSettings === undefined) {
    deviceState.connectionSettings = {
      openDmxRefreshRateHz: 30,
      universeCount: 1,
      dmxUniverseByDevice: {},
      artNetIpByUniverse: {},
    }
  }

  if (deviceState.connectionSettings.universeCount === undefined) {
    deviceState.connectionSettings.universeCount = 1
  }

  deviceState.connectionSettings.universeCount = clampUniverse(
    deviceState.connectionSettings.universeCount
  )

  if (deviceState.connectionSettings.dmxUniverseByDevice === undefined) {
    deviceState.connectionSettings.dmxUniverseByDevice = {}
  }

  if (deviceState.connectionSettings.artNetIpByUniverse === undefined) {
    deviceState.connectionSettings.artNetIpByUniverse = {}
  }

  for (const [connectionId, universe] of Object.entries(
    deviceState.connectionSettings.dmxUniverseByDevice
  )) {
    deviceState.connectionSettings.dmxUniverseByDevice[connectionId] =
      clampUniverse(universe, deviceState.connectionSettings.universeCount)
  }

  const normalizedArtNetRoutes: { [universe: number]: string } = {}
  for (const [universeKey, ip] of Object.entries(
    deviceState.connectionSettings.artNetIpByUniverse
  )) {
    const parsedUniverse = Number(universeKey)
    if (!Number.isFinite(parsedUniverse)) continue

    const universe = clampUniverse(
      parsedUniverse,
      deviceState.connectionSettings.universeCount
    )
    const normalizedIp = ip.trim()
    if (normalizedIp.length > 0) {
      normalizedArtNetRoutes[universe] = normalizedIp
    }
  }

  deviceState.connectionSettings.artNetIpByUniverse = normalizedArtNetRoutes

  const legacyArtNetIp = deviceState.connectable.artNet[0]?.trim()
  if (
    legacyArtNetIp &&
    Object.keys(deviceState.connectionSettings.artNetIpByUniverse).length === 0
  ) {
    for (
      let universe = 1;
      universe <= deviceState.connectionSettings.universeCount;
      universe++
    ) {
      deviceState.connectionSettings.artNetIpByUniverse[universe] =
        legacyArtNetIp
    }
  }

  for (const connectionId of deviceState.connectable.dmx) {
    if (
      deviceState.connectionSettings.dmxUniverseByDevice[connectionId] ===
      undefined
    ) {
      deviceState.connectionSettings.dmxUniverseByDevice[connectionId] = 1
    }
  }

  normalizeDeviceMidiMappings(deviceState)
}

function normalizeSliderOptions(
  action: MidiAction,
  options: any
): SliderControlOptions | null {
  if (options === null || typeof options !== 'object') return null

  const min = Number.isFinite(options.min) ? Number(options.min) : 0
  const max = Number.isFinite(options.max) ? Number(options.max) : 1
  const normalizedMin = Math.min(min, max)
  const normalizedMax = Math.max(min, max)

  const rawOptions: SliderControlOptions | null =
    options.type === 'cc'
      ? {
          type: 'cc',
          min: normalizedMin,
          max: normalizedMax,
          mode: options.mode === 'relative' ? 'relative' : 'absolute',
        }
      : options.type === 'note'
      ? {
          type: 'note',
          min: normalizedMin,
          max: normalizedMax,
          mode: options.mode === 'toggle' ? 'toggle' : 'hold',
          value: options.value === 'max' ? 'max' : 'velocity',
        }
      : null

  if (rawOptions === null) return null

  return normalizeSliderOptionsForAction(action, rawOptions)
}

function normalizeDeviceMidiMappings(deviceState: DeviceState) {
  if (deviceState.buttonActions === undefined) {
    ;(deviceState as DeviceState & { buttonActions?: DeviceState['buttonActions'] }).buttonActions = {}
  }

  if (deviceState.sliderActions === undefined) {
    ;(deviceState as DeviceState & { sliderActions?: DeviceState['sliderActions'] }).sliderActions = {}
  }

  for (const [actionId, sliderAction] of Object.entries(deviceState.sliderActions)) {
    const action = (sliderAction as any).action as MidiAction | undefined
    const normalizedOptions =
      action && typeof action.type === 'string'
        ? normalizeSliderOptions(action, (sliderAction as any).options)
        : null

    if (normalizedOptions === null || action === undefined) {
      delete deviceState.sliderActions[actionId]
      continue
    }

    ;(sliderAction as any).options = normalizedOptions
  }
}

type DeprecatedMixerState = MixerState & {
  overwrites?: number[]
  activeUniverse?: number
  overwritesByUniverse?: { [universe: number]: number[] }
}

export function fixMixerState(mixerState: MixerState) {
  const mixer = mixerState as DeprecatedMixerState

  if (mixer.activeUniverse === undefined) {
    mixer.activeUniverse = 1
  }
  mixer.activeUniverse = clampUniverse(mixer.activeUniverse)

  if (mixer.overwritesByUniverse === undefined) {
    mixer.overwritesByUniverse = {}
  }

  if (
    mixer.overwritesByUniverse[1] === undefined &&
    Array.isArray(mixer.overwrites)
  ) {
    mixer.overwritesByUniverse[1] = mixer.overwrites
  }
}

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
