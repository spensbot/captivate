import {
  DeviceState,
  MidiAction,
  SliderControlOptions,
  initDeviceState,
  normalizeSliderOptionsForAction,
} from 'renderer/redux/deviceState'
import {
  initAudioInputSettings,
  normalizeAudioBandConfig,
  normalizeAudioInputSettings,
} from './audioEngine'
import {
  initAtmosSettings,
  normAtmosSettings,
} from './atmospherics'
import { DmxState, normalizeLighting3DSettings } from 'renderer/redux/dmxSlice'
import { initLedState } from 'renderer/redux/ledState'
import { normalizeAppSettings } from './appSettings'
import type { CleanReduxState } from '../renderer/redux/store'
import {
  initLaserState,
  migrateLaserProjectState,
} from '../renderer/laser/laserProjectState'
import { MixerState } from 'renderer/redux/mixerSlice'
import { ColorChannel, inferColorKind } from './dmxColors'
import {
  DmxValue,
  FixtureChannel,
  FixtureRotation,
  initChannelCustom,
  fixtureChannelLeafChannels,
  initFixtureRotation,
  initMoverCalibration,
  initMoverBounds,
  isMoverFixtureType,
  normalizeFixtureModelConfig,
  migrateLegacyFixtureChannelDiscriminators,
  migrateLegacySubFixtureGroupLabelsOnFixtureType,
  remapLegacySubFixtureGroupNames,
  remapLegacySubFixtureGroupRecord,
  LEGACY_SUB_FIXTURE_LABEL_REMAP,
  DMX_MIN_VALUE,
  DMX_MAX_VALUE,
  DMX_MAX_UNIVERSES,
  MOVER_MIN_PAN_RANGE_DEG,
  MOVER_MAX_PAN_RANGE_DEG,
  MOVER_MIN_TILT_RANGE_DEG,
  MOVER_MAX_TILT_RANGE_DEG,
  MOVER_DEFAULT_PAN_RANGE_DEG,
  MOVER_DEFAULT_TILT_RANGE_DEG,
  MoverMountOrientation,
} from './dmxFixtures'
import {
  normalizeFixtureGroupList,
  syncFixtureGroupCatalog,
} from './fixtureGroups'
import { normalizeStageDimensions } from './stage'
import { LfoShape, normalizeLfoShape } from './oscillator'
import { snapLfoPeriodToUi } from './lfoPeriod'
import { nanoid } from 'nanoid'
import {
  AutoScene_t,
  LightScenes_t,
  VisualScenes_t,
  VisualSceneTransitionConfig,
  initLightScene,
  initSplitScene,
} from './Scenes'
import {
  normLayerCfg,
} from '../visualizer/threejs/layers/LayerConfig'
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

type Deprecated_Color = 'red' | 'green' | 'blue' | 'white' | ColorChannel

function clampUniverse(value: number, maxUniverse: number = DMX_MAX_UNIVERSES) {
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(1, Math.round(value)), maxUniverse)
}

function ensureFixtureId(fixture: DmxState['universe'][number]): string {
  if (typeof fixture.id === 'string' && fixture.id.trim().length > 0) {
    return fixture.id
  }
  fixture.id = nanoid()
  return fixture.id
}

function defaultMoverGroupName(
  fixture: DmxState['universe'][number],
  fixtureTypeName: string
): string {
  const fixtureGroup = fixture.groups.find((group) => group.trim().length > 0)
  if (fixtureGroup !== undefined) {
    return fixtureGroup
  }

  return fixtureTypeName.trim().length > 0 ? fixtureTypeName : 'Mover Group'
}


function normalizeMoverMountOrientation(
  orientation: unknown
): MoverMountOrientation {
  return orientation === 'inverted' ? 'inverted' : 'upright'
}

function normalizeFixtureRotationAxis(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }

  const wrapped = ((numeric + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 ? 180 : wrapped
}

function normalizeFixtureRotation(rotation: unknown): FixtureRotation {
  const source = (rotation !== null && typeof rotation === 'object'
    ? rotation
    : {}) as {
    x?: unknown
    y?: unknown
    z?: unknown
  }
  const defaults = initFixtureRotation()

  return {
    x: normalizeFixtureRotationAxis(source.x ?? defaults.x),
    y: normalizeFixtureRotationAxis(source.y ?? defaults.y),
    z: normalizeFixtureRotationAxis(source.z ?? defaults.z),
  }
}
function clampDmxValue(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function normalizeMoverCalibrationValues(calibration: unknown) {
  const defaults = initMoverCalibration()
  const source = (calibration !== null && typeof calibration === 'object'
    ? calibration
    : {}) as {
    pan?: {
      min?: unknown
      max?: unknown
      front?: unknown
      back?: unknown
      home?: unknown
      rangeDeg?: unknown
      turns?: unknown
      invert?: unknown
    }
    tilt?: {
      min?: unknown
      max?: unknown
      down?: unknown
      forward?: unknown
      up?: unknown
      home?: unknown
      rangeDeg?: unknown
      invert?: unknown
    }
    notes?: unknown
  }

  const rawValues = [
    Number(source.pan?.min),
    Number(source.pan?.max),
    Number(source.pan?.front),
    Number(source.pan?.back),
    Number(source.pan?.home),
    Number(source.tilt?.min),
    Number(source.tilt?.max),
    Number(source.tilt?.down),
    Number(source.tilt?.forward),
    Number(source.tilt?.up),
    Number(source.tilt?.home),
  ].filter((value) => Number.isFinite(value))

  const isLegacyNormalized =
    rawValues.length > 0 && rawValues.every((value) => value >= 0 && value <= 1)

  const toDmx = (value: unknown, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return clampDmxValue(
      isLegacyNormalized ? numeric * DMX_MAX_VALUE : numeric,
      fallback
    )
  }

  const panRangeRaw = Number(source.pan?.rangeDeg)
  const turnsRaw = Number(source.pan?.turns)
  const panRangeDeg = Number.isFinite(panRangeRaw)
    ? Math.max(MOVER_MIN_PAN_RANGE_DEG, Math.min(MOVER_MAX_PAN_RANGE_DEG, panRangeRaw))
    : Number.isFinite(turnsRaw)
    ? Math.max(
        MOVER_MIN_PAN_RANGE_DEG,
        Math.min(MOVER_MAX_PAN_RANGE_DEG, turnsRaw * 360)
      )
    : defaults.pan.rangeDeg ?? MOVER_DEFAULT_PAN_RANGE_DEG

  const tiltRangeRaw = Number(source.tilt?.rangeDeg)
  const tiltRangeDeg = Number.isFinite(tiltRangeRaw)
    ? Math.max(MOVER_MIN_TILT_RANGE_DEG, Math.min(MOVER_MAX_TILT_RANGE_DEG, tiltRangeRaw))
    : defaults.tilt.rangeDeg ?? MOVER_DEFAULT_TILT_RANGE_DEG

  return {
    pan: {
      min: toDmx(source.pan?.min, defaults.pan.min),
      max: toDmx(source.pan?.max, defaults.pan.max),
      front: toDmx(source.pan?.front, defaults.pan.front),
      back: toDmx(source.pan?.back, defaults.pan.back),
      home: toDmx(source.pan?.home, defaults.pan.home),
      rangeDeg: panRangeDeg,
      invert: source.pan?.invert === true,
    },
    tilt: {
      min: toDmx(source.tilt?.min, defaults.tilt.min),
      max: toDmx(source.tilt?.max, defaults.tilt.max),
      down: toDmx(source.tilt?.down, defaults.tilt.down),
      forward: toDmx(source.tilt?.forward, defaults.tilt.forward),
      up: toDmx(source.tilt?.up, defaults.tilt.up),
      home: toDmx(source.tilt?.home, defaults.tilt.home),
      rangeDeg: tiltRangeDeg,
      invert: source.tilt?.invert === true,
    },
  }
}

function normalizeMoverBoundsValues(bounds: unknown) {
  const defaults = initMoverBounds()
  const source = (bounds !== null && typeof bounds === 'object'
    ? bounds
    : {}) as {
    topLeft?: { pan?: unknown; tilt?: unknown }
    topRight?: { pan?: unknown; tilt?: unknown }
    bottomLeft?: { pan?: unknown; tilt?: unknown }
    bottomRight?: { pan?: unknown; tilt?: unknown }
  }

  const rawValues = [
    Number(source.topLeft?.pan),
    Number(source.topLeft?.tilt),
    Number(source.topRight?.pan),
    Number(source.topRight?.tilt),
    Number(source.bottomLeft?.pan),
    Number(source.bottomLeft?.tilt),
    Number(source.bottomRight?.pan),
    Number(source.bottomRight?.tilt),
  ].filter((value) => Number.isFinite(value))

  const isLegacyNormalized =
    rawValues.length > 0 && rawValues.every((value) => value >= 0 && value <= 1)

  const toDmx = (value: unknown, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return clampDmxValue(
      isLegacyNormalized ? numeric * DMX_MAX_VALUE : numeric,
      fallback
    )
  }

  return {
    topLeft: {
      pan: toDmx(source.topLeft?.pan, defaults.topLeft.pan),
      tilt: toDmx(source.topLeft?.tilt, defaults.topLeft.tilt),
    },
    topRight: {
      pan: toDmx(source.topRight?.pan, defaults.topRight.pan),
      tilt: toDmx(source.topRight?.tilt, defaults.topRight.tilt),
    },
    bottomLeft: {
      pan: toDmx(source.bottomLeft?.pan, defaults.bottomLeft.pan),
      tilt: toDmx(source.bottomLeft?.tilt, defaults.bottomLeft.tilt),
    },
    bottomRight: {
      pan: toDmx(source.bottomRight?.pan, defaults.bottomRight.pan),
      tilt: toDmx(source.bottomRight?.tilt, defaults.bottomRight.tilt),
    },
  }
}

// Modify this function to fix any breaking state changes between upgrades
function fixGuiState(gui: CleanReduxState['gui']) {
  const _gui = gui as CleanReduxState['gui'] & {
    moverCalibrationOverride?: unknown
    colorMapCalibrationOverride?: unknown
    goboMapCalibrationOverride?: unknown
    prismMapCalibrationOverride?: unknown
  }

  if (
    typeof (_gui as { moverAdvancedControlEnabled?: unknown })
      .moverAdvancedControlEnabled !== 'boolean'
  ) {
    ;(_gui as { moverAdvancedControlEnabled: boolean }).moverAdvancedControlEnabled =
      false
  }

  const moverOverride = _gui.moverCalibrationOverride as
    | {
        fixtureId?: unknown
        panDmx?: unknown
        tiltDmx?: unknown
      }
    | null
    | undefined

  if (
    moverOverride !== null &&
    moverOverride !== undefined &&
    typeof moverOverride.fixtureId === 'string' &&
    Number.isFinite(Number(moverOverride.panDmx)) &&
    Number.isFinite(Number(moverOverride.tiltDmx))
  ) {
    _gui.moverCalibrationOverride = {
      fixtureId: moverOverride.fixtureId,
      panDmx: clampDmxValue(Number(moverOverride.panDmx), DMX_MIN_VALUE),
      tiltDmx: clampDmxValue(Number(moverOverride.tiltDmx), DMX_MIN_VALUE),
    }
  } else {
    _gui.moverCalibrationOverride = null
  }

  const colorMapOverride = _gui.colorMapCalibrationOverride as
    | {
        fixtureTypeId?: unknown
        channelIndex?: unknown
        dmxValue?: unknown
      }
    | null
    | undefined

  if (
    colorMapOverride !== null &&
    colorMapOverride !== undefined &&
    typeof colorMapOverride.fixtureTypeId === 'string' &&
    Number.isFinite(Number(colorMapOverride.channelIndex)) &&
    Number.isFinite(Number(colorMapOverride.dmxValue))
  ) {
    _gui.colorMapCalibrationOverride = {
      fixtureTypeId: colorMapOverride.fixtureTypeId,
      channelIndex: Math.max(0, Math.round(Number(colorMapOverride.channelIndex))),
      dmxValue: clampDmxValue(Number(colorMapOverride.dmxValue), DMX_MIN_VALUE),
    }
  } else {
    _gui.colorMapCalibrationOverride = null
  }

  const goboMapOverride = _gui.goboMapCalibrationOverride as
    | {
        fixtureTypeId?: unknown
        channelIndex?: unknown
        dmxValue?: unknown
      }
    | null
    | undefined

  if (
    goboMapOverride !== null &&
    goboMapOverride !== undefined &&
    typeof goboMapOverride.fixtureTypeId === 'string' &&
    Number.isFinite(Number(goboMapOverride.channelIndex)) &&
    Number.isFinite(Number(goboMapOverride.dmxValue))
  ) {
    _gui.goboMapCalibrationOverride = {
      fixtureTypeId: goboMapOverride.fixtureTypeId,
      channelIndex: Math.max(0, Math.round(Number(goboMapOverride.channelIndex))),
      dmxValue: clampDmxValue(Number(goboMapOverride.dmxValue), DMX_MIN_VALUE),
    }
  } else {
    _gui.goboMapCalibrationOverride = null
  }

  const prismMapOverride = _gui.prismMapCalibrationOverride as
    | {
        fixtureTypeId?: unknown
        channelIndex?: unknown
        dmxValue?: unknown
      }
    | null
    | undefined

  if (
    prismMapOverride !== null &&
    prismMapOverride !== undefined &&
    typeof prismMapOverride.fixtureTypeId === 'string' &&
    Number.isFinite(Number(prismMapOverride.channelIndex)) &&
    Number.isFinite(Number(prismMapOverride.dmxValue))
  ) {
    _gui.prismMapCalibrationOverride = {
      fixtureTypeId: prismMapOverride.fixtureTypeId,
      channelIndex: Math.max(0, Math.round(Number(prismMapOverride.channelIndex))),
      dmxValue: clampDmxValue(Number(prismMapOverride.dmxValue), DMX_MIN_VALUE),
    }
  } else {
    _gui.prismMapCalibrationOverride = null
  }
}

function fixScenesAuto(auto: AutoScene_t): void {
  auto.enabled = auto.enabled === true
  if (!Number.isFinite(auto.epicness)) {
    auto.epicness = 0
  } else {
    auto.epicness = Math.min(1, Math.max(0, auto.epicness))
  }
  if (!Number.isFinite(auto.period) || auto.period < 1) {
    auto.period = 1
  }
  // Older saves used matchAudioEnergy as the sole energy-mode flag.
  if (auto.energyMatchEnabled !== true && auto.matchAudioEnergy === true) {
    auto.energyMatchEnabled = true
  }
  auto.energyMatchEnabled = auto.energyMatchEnabled === true
  auto.matchAudioEnergy = auto.matchAudioEnergy === true
}

export default function fixState(state: CleanReduxState): CleanReduxState {
  if (state.control.device === undefined || state.control.device === null) {
    state.control.device = initDeviceState()
  }
  fixGuiState(state.gui)
  fixLightScenes(state.control.light)
  fixVisualScenes(state.control.visual)
  fixScenesAuto(state.control.light.auto)
  fixScenesAuto(state.control.visual.auto)
  fixDmxState(state.dmx)
  remapLegacySubFixtureLabelsInLightScenes(
    state.control.light,
    LEGACY_SUB_FIXTURE_LABEL_REMAP
  )
  fixDeviceState(state.control.device)
  fixMixerState(state.mixer)

  const selectedFixtureIndex = state.dmx.activeFixture
  const selectedFixture =
    selectedFixtureIndex !== null ? state.dmx.universe[selectedFixtureIndex] : undefined

  if (
    state.gui.moverCalibrationOverride !== null &&
    selectedFixture?.id !== state.gui.moverCalibrationOverride.fixtureId
  ) {
    state.gui.moverCalibrationOverride = null
  }

  if (state.gui.colorMapCalibrationOverride !== null) {
    const fixtureTypeId = state.gui.colorMapCalibrationOverride.fixtureTypeId
    if (state.dmx.fixtureTypesByID[fixtureTypeId] === undefined) {
      state.gui.colorMapCalibrationOverride = null
    }
  }

  if (state.gui.goboMapCalibrationOverride !== null) {
    const fixtureTypeId = state.gui.goboMapCalibrationOverride.fixtureTypeId
    if (state.dmx.fixtureTypesByID[fixtureTypeId] === undefined) {
      state.gui.goboMapCalibrationOverride = null
    }
  }

  if (state.gui.prismMapCalibrationOverride !== null) {
    const fixtureTypeId = state.gui.prismMapCalibrationOverride.fixtureTypeId
    if (state.dmx.fixtureTypesByID[fixtureTypeId] === undefined) {
      state.gui.prismMapCalibrationOverride = null
    }
  }

  state.laser = migrateLaserProjectState(state.laser ?? initLaserState())

  state.gui.appSettings = normalizeAppSettings(state.gui.appSettings)

  return state
}

function remapLegacySubFixtureLabelsInLightScenes(
  light: LightScenes_t,
  remap: Map<string, string>
): void {
  if (remap.size === 0) {
    return
  }
  for (const id of light.ids) {
    const scene = light.byId[id]
    if (scene === undefined) {
      continue
    }
    for (const split of scene.splitScenes) {
      remapLegacySubFixtureGroupRecord(split.groups, remap)
    }
  }
}

export function fixLightScenes(light: LightScenes_t) {
  if (light.ids.length === 0) {
    const id = nanoid()
    light.ids = [id]
    light.byId[id] = initLightScene()
    light.active = id
  } else if (!light.active || light.byId[light.active] === undefined) {
    light.active = light.ids[0]
  }

  for (const id of light.ids) {
    const scene = light.byId[id]
    if (scene === undefined) {
      continue
    }
    if (!Array.isArray(scene.splitScenes) || scene.splitScenes.length === 0) {
      scene.splitScenes = [initSplitScene()]
    }
  }

  for (const modulator of modulators(light)) {
    const lfo = modulator.lfo as {
      shape?: unknown
      skew?: number
      symmetricSkew?: number
      phaseShift?: number
      flip?: number
      period?: number
      sinePeakWidth?: number
      rampCurve?: number
      squareDuty?: number
      sawFlatten?: number
      noiseSeed?: number
      noiseSmoothing?: number
      audioBandLowHz?: number
      audioBandHighHz?: number
      audioThreshold?: number
      audioMax?: number
      audioAttack?: number
      audioDecay?: number
      audioEnergySmoothing?: number
      audioBandSmoothing?: number
      audioGain?: number
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
    } else {
      modulator.lfo.period = snapLfoPeriodToUi(Number(lfo.period))
    }
    modulator.lfo.sinePeakWidth = Number.isFinite(lfo.sinePeakWidth)
      ? Math.min(1, Math.max(0, Number(lfo.sinePeakWidth)))
      : 0.5
    modulator.lfo.rampCurve = Number.isFinite(lfo.rampCurve)
      ? Math.min(1, Math.max(0, Number(lfo.rampCurve)))
      : 0.5
    modulator.lfo.squareDuty = Number.isFinite(lfo.squareDuty)
      ? Math.min(1, Math.max(0, Number(lfo.squareDuty)))
      : 0.5
    modulator.lfo.sawFlatten = Number.isFinite(lfo.sawFlatten)
      ? Math.min(1, Math.max(0, Number(lfo.sawFlatten)))
      : 0
    modulator.lfo.noiseSeed = Number.isFinite(lfo.noiseSeed)
      ? Math.min(1, Math.max(0, Number(lfo.noiseSeed)))
      : 0.5
    modulator.lfo.noiseSmoothing = Number.isFinite(lfo.noiseSmoothing)
      ? Math.min(1, Math.max(0, Number(lfo.noiseSmoothing)))
      : 0

    const normalizedBand = normalizeAudioBandConfig({
      lowHz: lfo.audioBandLowHz,
      highHz: lfo.audioBandHighHz,
    })
    modulator.lfo.audioBandLowHz = normalizedBand.lowHz
    modulator.lfo.audioBandHighHz = normalizedBand.highHz
    modulator.lfo.audioThreshold = Number.isFinite(lfo.audioThreshold)
      ? Math.min(0.99, Math.max(0, Number(lfo.audioThreshold)))
      : 0.02
    modulator.lfo.audioMax = Number.isFinite(lfo.audioMax)
      ? Math.min(1, Math.max(modulator.lfo.audioThreshold + 0.01, Number(lfo.audioMax)))
      : Math.min(1, Math.max(modulator.lfo.audioThreshold + 0.01, 0.6))
    if (normalizeLfoShape(modulator.lfo.shape) === LfoShape.AudioBand) {
      const cap = 0.65
      modulator.lfo.audioMax = Math.min(cap, modulator.lfo.audioMax)
      if (modulator.lfo.audioMax <= modulator.lfo.audioThreshold) {
        modulator.lfo.audioMax = Math.min(
          cap,
          modulator.lfo.audioThreshold + 0.01
        )
      }
    }
    modulator.lfo.audioAttack = Number.isFinite(lfo.audioAttack)
      ? Math.min(1, Math.max(0, Number(lfo.audioAttack)))
      : 0.35
    modulator.lfo.audioDecay = Number.isFinite(lfo.audioDecay)
      ? Math.min(1, Math.max(0, Number(lfo.audioDecay)))
      : 0.55
    modulator.lfo.audioEnergySmoothing = Number.isFinite(lfo.audioEnergySmoothing)
      ? Math.min(1, Math.max(0, Number(lfo.audioEnergySmoothing)))
      : 0.65
    modulator.lfo.audioBandSmoothing = Number.isFinite(lfo.audioBandSmoothing)
      ? Math.min(1, Math.max(0, Number(lfo.audioBandSmoothing)))
      : 0
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

      const INTER_MOD_PREFIX = 'intermod:lfo:'
      const merged: Record<string, number> = {
        ...(modulator.lfoInterModulation as Record<string, number> | undefined),
      }
      for (let i = 0; i < modulator.splitModulations.length; i++) {
        const sm = modulator.splitModulations[i]
        if (sm === undefined || sm === null) continue
        for (const [key, val] of Object.entries(sm)) {
          if (!key.startsWith(INTER_MOD_PREFIX)) continue
          if (typeof val === 'number' && Number.isFinite(val)) {
            merged[key] = val
          }
          delete sm[key]
        }
      }
      if (Object.keys(merged).length > 0) {
        modulator.lfoInterModulation = merged
      } else {
        delete modulator.lfoInterModulation
      }
    }
  }
}

export function fixVisualScenes(visualState: VisualScenes_t) {
  for (const scene of visualScenes(visualState)) {
    scene.config = normLayerCfg(scene.config) as typeof scene.config

    if (typeof scene.name !== 'string') {
      scene.name = 'Name'
    }

    if (!Number.isFinite(scene.epicness)) {
      scene.epicness = 0
    } else {
      scene.epicness = Math.min(1, Math.max(0, scene.epicness))
    }

    scene.autoEnabled = scene.autoEnabled !== false
    scene.transition = normalizeVisualSceneTransition(scene.transition)
  }
}

function normalizeVisualSceneTransition(
  value: unknown
): VisualSceneTransitionConfig {
  const source = (value ?? {}) as Partial<VisualSceneTransitionConfig>
  const type =
    source.type === 'cut' ||
    source.type === 'fade' ||
    source.type === 'dissolve' ||
    source.type === 'flash'
      ? source.type
      : 'fade'
  const rawDuration = Number(source.durationMs)
  const durationMs =
    Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.max(80, Math.min(6000, Math.round(rawDuration)))
      : 420
  return {
    type,
    durationMs,
  }
}

export function fixDmxState(dmx: DmxState) {
  for (const id of dmx.fixtureTypes) {
    const ft = dmx.fixtureTypesByID[id]
    if (ft !== undefined) {
      ft.channels = migrateLegacyFixtureChannelDiscriminators(ft.channels)
    }
  }

  const maybeStageState = dmx as DmxState & { stage?: unknown }
  maybeStageState.stage = normalizeStageDimensions(maybeStageState.stage)
  const maybeLighting3DState = dmx as DmxState & { lighting3d?: unknown }
  maybeLighting3DState.lighting3d = normalizeLighting3DSettings(
    maybeLighting3DState.lighting3d
  )

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

  for (const fixture of fixtureTypes(dmx)) {
    for (let i = 0; i < fixture.channels.length; i++) {
      fixture.channels[i] = migrateLegacyFocusChannel(fixture.channels[i])
    }
  }

  // Add subfixtures to all fixtures
  for (const fixture of fixtureTypes(dmx)) {
    if (fixture.subFixtures === undefined) {
      fixture.subFixtures = []
    }
  }

  const subLabelRemap = LEGACY_SUB_FIXTURE_LABEL_REMAP

  // Add groups + mover calibration defaults
  for (const fixtureType of fixtureTypes(dmx)) {
    migrateLegacySubFixtureGroupLabelsOnFixtureType(fixtureType, subLabelRemap)
    if (!Array.isArray(fixtureType.groups)) {
      fixtureType.groups = []
    }

    fixtureType.model = normalizeFixtureModelConfig(
      fixtureType.model,
      fixtureType
    )

    if (isMoverFixtureType(fixtureType)) {
      fixtureType.moverCalibration = normalizeMoverCalibrationValues(
        fixtureType.moverCalibration
      )
    }
  }
  for (const fixture of dmx.universe as (typeof dmx.universe[number] & {
    universe?: number
    name?: unknown
  })[]) {
    ensureFixtureId(fixture)

    if (typeof fixture.name === 'string') {
      fixture.name = fixture.name.trim()
      if (fixture.name.length === 0) {
        delete fixture.name
      }
    } else {
      delete fixture.name
    }

    if (!Array.isArray(fixture.groups)) {
      fixture.groups = []
    }
    fixture.groups = remapLegacySubFixtureGroupNames(fixture.groups, subLabelRemap)
    const fixtureTypeForGroups = dmx.fixtureTypesByID[fixture.type]
    if (
      fixtureTypeForGroups !== undefined &&
      fixture.groups.length === 0 &&
      fixtureTypeForGroups.groups.length > 0
    ) {
      fixture.groups = normalizeFixtureGroupList(fixtureTypeForGroups.groups)
    }
    if (fixture.universe === undefined) {
      fixture.universe = 1
    }
    fixture.universe = clampUniverse(fixture.universe)

    if (fixture.moverBounds !== undefined) {
      fixture.moverBounds = normalizeMoverBoundsValues(fixture.moverBounds)
    }
    fixture.moverMountOrientation = normalizeMoverMountOrientation(
      fixture.moverMountOrientation
    )
    fixture.rotation = normalizeFixtureRotation(fixture.rotation)
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

  syncFixtureGroupCatalog(dmx.universe, dmx.fixtureTypesByID)

  if (
    (dmx as DmxState & { moverGroupByFixtureId?: { [fixtureId: string]: string } })
      .moverGroupByFixtureId === undefined
  ) {
    ;(
      dmx as DmxState & {
        moverGroupByFixtureId?: { [fixtureId: string]: string }
      }
    ).moverGroupByFixtureId = {}
  }

  const moverGroupByFixtureId =
    (
      dmx as DmxState & {
        moverGroupByFixtureId?: { [fixtureId: string]: string }
      }
    ).moverGroupByFixtureId ?? {}

  const validFixtureIds = new Set<string>()
  for (const fixture of dmx.universe) {
    const fixtureId = ensureFixtureId(fixture)
    validFixtureIds.add(fixtureId)

    const fixtureType = dmx.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined || !isMoverFixtureType(fixtureType)) continue

    if (moverGroupByFixtureId[fixtureId] === undefined) {
      moverGroupByFixtureId[fixtureId] = defaultMoverGroupName(
        fixture,
        fixtureType.name
      )
    }
  }

  for (const fixtureId of Object.keys(moverGroupByFixtureId)) {
    if (!validFixtureIds.has(fixtureId)) {
      delete moverGroupByFixtureId[fixtureId]
    }
  }

  dmx.moverGroupByFixtureId = moverGroupByFixtureId

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
    } else if (channel.type === 'goboMap') {
      if (!Array.isArray(channel.gobos) || channel.gobos.length === 0) {
        channel.gobos = [{ name: 'Open', max: 0 }]
      }

      for (let i = 0; i < channel.gobos.length; i++) {
        const gobo = channel.gobos[i]
        if (typeof gobo.name !== 'string' || gobo.name.trim().length === 0) {
          gobo.name = `Gobo ${i + 1}`
        }
        if (!Number.isFinite(gobo.max)) {
          gobo.max = 0
        }
      }

      if (!Number.isFinite(channel.defaultIndex)) {
        channel.defaultIndex = 0
      }
      channel.defaultIndex = Math.max(
        0,
        Math.min(channel.defaultIndex, channel.gobos.length - 1)
      )
    } else if (channel.type === 'focus') {
      if (!Number.isFinite(channel.min)) {
        channel.min = DMX_MIN_VALUE
      }
      if (!Number.isFinite(channel.max)) {
        channel.max = DMX_MAX_VALUE
      }
      if (!Number.isFinite(channel.default)) {
        channel.default = DMX_MIN_VALUE
      }
    } else if (channel.type === 'prismMap') {
      if (!Array.isArray(channel.prisms) || channel.prisms.length === 0) {
        channel.prisms = [{ name: 'Open', max: 0 }]
      }

      for (let i = 0; i < channel.prisms.length; i++) {
        const prism = channel.prisms[i]
        if (typeof prism.name !== 'string' || prism.name.trim().length === 0) {
          prism.name = `Prism ${i + 1}`
        }
        if (!Number.isFinite(prism.max)) {
          prism.max = 0
        }
      }

      if (!Number.isFinite(channel.defaultIndex)) {
        channel.defaultIndex = 0
      }
      channel.defaultIndex = Math.max(
        0,
        Math.min(channel.defaultIndex, channel.prisms.length - 1)
      )
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
      dmxUsbUseWidgetProtocolByDevice: {},
      artNetIpByUniverse: {},
      audioInput: initAudioInputSettings(),
      midiClockBpmEnabled: false,
      linkEnabled: false,
      linkStartStopSyncEnabled: false,
      atmos: initAtmosSettings(),
    }
  }

  deviceState.connectionSettings.midiClockBpmEnabled =
    deviceState.connectionSettings.midiClockBpmEnabled === true
  deviceState.connectionSettings.linkEnabled =
    deviceState.connectionSettings.linkEnabled === true
  deviceState.connectionSettings.linkStartStopSyncEnabled =
    deviceState.connectionSettings.linkStartStopSyncEnabled === true

  if (deviceState.connectionSettings.universeCount === undefined) {
    deviceState.connectionSettings.universeCount = 1
  }

  deviceState.connectionSettings.universeCount = clampUniverse(
    deviceState.connectionSettings.universeCount
  )

  if (deviceState.connectionSettings.dmxUniverseByDevice === undefined) {
    deviceState.connectionSettings.dmxUniverseByDevice = {}
  }

  if (deviceState.connectionSettings.dmxUsbUseWidgetProtocolByDevice === undefined) {
    deviceState.connectionSettings.dmxUsbUseWidgetProtocolByDevice = {}
  }

  if (deviceState.connectionSettings.artNetIpByUniverse === undefined) {
    deviceState.connectionSettings.artNetIpByUniverse = {}
  }

  deviceState.connectionSettings.audioInput = normalizeAudioInputSettings(
    deviceState.connectionSettings.audioInput
  )
  deviceState.connectionSettings.audioInput.beatTapHintBpm = null
  deviceState.connectionSettings.audioInput.beatTapHintAtMs = 0
  deviceState.connectionSettings.atmos = normAtmosSettings(
    deviceState.connectionSettings.atmos
  )

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
  if (deviceState.keyboardShortcuts === undefined) {
    ;(deviceState as DeviceState & { keyboardShortcuts?: DeviceState['keyboardShortcuts'] }).keyboardShortcuts = {}
  }
  if (deviceState.keyboardLearnMode === undefined) {
    ;(deviceState as DeviceState & { keyboardLearnMode?: boolean }).keyboardLearnMode = false
  }
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

function migrateLegacyFocusChannel(channel: FixtureChannel): FixtureChannel {
  if (channel.type === 'split') {
    return {
      ...channel,
      ranges: channel.ranges.map((range) => ({
        ...range,
        channel: migrateLegacyFocusLeafChannel(range.channel),
      })),
    }
  }
  return migrateLegacyFocusLeafChannel(channel)
}

function migrateLegacyFocusLeafChannel(
  channel: ReturnType<typeof fixtureChannelLeafChannels>[number]
): ReturnType<typeof fixtureChannelLeafChannels>[number] {
  if (
    channel.type === 'custom' &&
    channel.name.trim().toLowerCase().includes('focus')
  ) {
    return {
      type: 'focus',
      min: channel.min,
      max: channel.max,
      default: channel.default,
    }
  }
  return channel
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

