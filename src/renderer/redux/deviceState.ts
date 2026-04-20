import { PayloadAction } from '@reduxjs/toolkit'
import { DefaultParam } from '../../shared/params'
import { SceneType } from '.../../shared/Scenes'
import { ConnectionId } from '../../shared/connection'
import { DMX_MAX_UNIVERSES } from '../../shared/dmxFixtures'
import {
  AudioInputSettings,
  initAudioInputSettings,
  normalizeAudioInputSettings,
} from '../../shared/audioEngine'
import {
  AtmosphericsFixtureControlConfig,
  AtmosphericsLevelChannelConfig,
  AtmosphericsSettings,
  AtmosphericsTriggerChannelConfig,
  initAtmosphericsFixtureControlConfig,
  initAtmosphericsLevelChannelConfig,
  initAtmosphericsSettings,
  initAtmosphericsTriggerChannelConfig,
  normalizeAtmosphericsLevelChannelConfig,
  normalizeAtmosphericsSettings,
  normalizeAtmosphericsFixtureControlConfig,
  normalizeAtmosphericsTriggerChannelConfig,
} from '../../shared/atmospherics'

interface Range {
  min: number
  max: number
}
interface SliderControl_cc extends Range {
  type: 'cc'
  mode: 'absolute' | 'relative'
}
interface SliderControl_note extends Range {
  type: 'note'
  value: 'velocity' | 'max'
  mode: 'toggle' | 'hold'
}
export type SliderControlOptions = SliderControl_cc | SliderControl_note

export interface MidiSliderBounds {
  min: number
  max: number
  defaultMin: number
  defaultMax: number
}

function clampToRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

interface SetActiveSceneIndex {
  type: 'setActiveSceneIndex'
  sceneType: SceneType
  index: number
}

interface SetAutoSceneBombacity {
  type: 'setAutoSceneBombacity'
}

interface SetMaster {
  type: 'setMaster'
}
interface SetBpm {
  type: 'setBpm'
}

interface SetBaseParam {
  type: 'setBaseParam'
  paramKey: DefaultParam | string
}

interface TapTempo {
  type: 'tapTempo'
}

interface ToggleAutoScene {
  type: 'toggleAutoScene'
  sceneType: SceneType
}

interface ToggleBlackout {
  type: 'toggleBlackout'
}
interface ToggleMoverFollowOverride {
  type: 'toggleMoverFollowOverride'
}
interface SetMoverFollowOverridePan {
  type: 'setMoverFollowOverridePan'
}
interface SetMoverFollowOverrideTilt {
  type: 'setMoverFollowOverrideTilt'
}
interface TriggerAtmosFixture {
  type: 'triggerAtmosFixture'
  fixtureId: string
}

interface ConnectionSettings {
  openDmxRefreshRateHz: number
  universeCount: number
  dmxUniverseByDevice: { [connectionId: string]: number }
  artNetIpByUniverse: { [universe: number]: string }
  audioInput: AudioInputSettings
  /** Follow MIDI timing clock (0xF8) from enabled MIDI inputs for master BPM. */
  midiClockBpmEnabled: boolean
  atmospherics: AtmosphericsSettings
}

export const buttonMidiActionTypes: Set<MidiAction['type']> = new Set([
  'setActiveSceneIndex',
  'tapTempo',
  'toggleAutoScene',
  'toggleBlackout',
  'toggleMoverFollowOverride',
  'triggerAtmosFixture',
])

export type MidiAction =
  | SetActiveSceneIndex
  | SetAutoSceneBombacity
  | SetMaster
  | SetBaseParam
  | SetBpm
  | TapTempo
  | ToggleAutoScene
  | ToggleBlackout
  | ToggleMoverFollowOverride
  | SetMoverFollowOverridePan
  | SetMoverFollowOverrideTilt
  | TriggerAtmosFixture

export function getMidiSliderBounds(action: MidiAction): MidiSliderBounds {
  switch (action.type) {
    case 'setBpm':
      return {
        min: 1,
        max: 1000,
        defaultMin: 60,
        defaultMax: 180,
      }
    default:
      return {
        min: 0,
        max: 1,
        defaultMin: 0,
        defaultMax: 1,
      }
  }
}
export function normalizeSliderOptionsForAction(
  action: MidiAction,
  options: SliderControlOptions
): SliderControlOptions {
  const bounds = getMidiSliderBounds(action)
  let min = Number.isFinite(options.min) ? Number(options.min) : bounds.defaultMin
  let max = Number.isFinite(options.max) ? Number(options.max) : bounds.defaultMax
  // Legacy saves stored all slider mappings in normalized [0..1] space.
  // For action-specific ranges (e.g. BPM), migrate those to sensible defaults.
  if ((bounds.min !== 0 || bounds.max !== 1) && min >= 0 && max <= 1) {
    min = bounds.defaultMin
    max = bounds.defaultMax
  }
  min = clampToRange(min, bounds.min, bounds.max)
  max = clampToRange(max, bounds.min, bounds.max)
  const normalizedMin = Math.min(min, max)
  const normalizedMax = Math.max(min, max)
  if (options.type === 'cc') {
    return {
      type: 'cc',
      min: normalizedMin,
      max: normalizedMax,
      mode: options.mode === 'relative' ? 'relative' : 'absolute',
    }
  }
  return {
    type: 'note',
    min: normalizedMin,
    max: normalizedMax,
    mode: options.mode === 'toggle' ? 'toggle' : 'hold',
    value: options.value === 'max' ? 'max' : 'velocity',
  }
}
export function initSliderOptions(
  action: MidiAction,
  type: 'cc' | 'note'
): SliderControlOptions {
  const bounds = getMidiSliderBounds(action)
  if (type === 'cc') {
    return {
      type: 'cc',
      min: bounds.defaultMin,
      max: bounds.defaultMax,
      mode: 'absolute',
    }
  }
  return {
    type: 'note',
    min: bounds.defaultMin,
    max: bounds.defaultMax,
    value: 'velocity',
    mode: 'hold',
  }
}

// must uniquely identify an action (for use in a hash table)
// does not need to be human readable. Just unique for a given action
export function getActionID(action: MidiAction) {
  if (action.type === 'setActiveSceneIndex') {
    return action.type + action.sceneType + action.index.toString()
  }
  if (action.type === 'setBaseParam') {
    return action.type + action.paramKey
  }
  if (action.type === 'triggerAtmosFixture') {
    return action.type + action.fixtureId
  }
  if (action.type === 'toggleAutoScene') {
    return action.type + action.sceneType
  }
  return action.type
}

export interface ButtonAction {
  inputID: string
  action: MidiAction
}
export interface SliderAction extends ButtonAction {
  options: SliderControlOptions
}

// ActionID = setAutoSceneBombacity, setActiveSceneIndex0, etc.
// InputID = note70, cc50, etc.
export interface DeviceState {
  listening?: MidiAction
  isEditing: boolean
  connectable: {
    midi: ConnectionId[]
    dmx: ConnectionId[]
    artNet: ConnectionId[]
  }
  connectionSettings: ConnectionSettings
  buttonActions: { [actionID: string]: ButtonAction }
  sliderActions: { [actionID: string]: SliderAction }
}

export function clampUniverseIndex(universe: number, maxUniverse: number) {
  if (!Number.isFinite(universe)) return 1
  const rounded = Math.round(universe)
  return Math.min(Math.max(1, rounded), maxUniverse)
}

function clampUniverseCount(universeCount: number) {
  return clampUniverseIndex(universeCount, DMX_MAX_UNIVERSES)
}

function clampDeviceUniverseAssignments(
  assignments: { [connectionId: string]: number },
  maxUniverse: number
) {
  const clamped: { [connectionId: string]: number } = {}
  for (const [connectionId, universe] of Object.entries(assignments)) {
    clamped[connectionId] = clampUniverseIndex(universe, maxUniverse)
  }
  return clamped
}

function clampArtNetRoutes(
  routes: { [universe: number]: string },
  maxUniverse: number
): { [universe: number]: string } {
  const clamped: { [universe: number]: string } = {}
  for (const [universeKey, ip] of Object.entries(routes)) {
    const parsedUniverse = Number(universeKey)
    if (!Number.isFinite(parsedUniverse)) continue

    const universe = clampUniverseIndex(parsedUniverse, maxUniverse)
    const normalizedIp = ip.trim()
    if (normalizedIp.length > 0) {
      clamped[universe] = normalizedIp
    }
  }
  return clamped
}

export function initDeviceState(): DeviceState {
  return {
    isEditing: false,
    buttonActions: {},
    sliderActions: {},
    connectable: {
      midi: [],
      dmx: [],
      artNet: [],
    },
    connectionSettings: {
      openDmxRefreshRateHz: 30,
      universeCount: 1,
      dmxUniverseByDevice: {},
      artNetIpByUniverse: {},
      audioInput: initAudioInputSettings(),
      midiClockBpmEnabled: false,
      atmospherics: initAtmosphericsSettings(),
    },
  }
}

function withNormalizedAtmospherics(state: DeviceState) {
  state.connectionSettings.atmospherics = normalizeAtmosphericsSettings(
    state.connectionSettings.atmospherics
  )
}

function findAtmosphericsFixtureConfig(
  state: DeviceState,
  fixtureId: string
): AtmosphericsFixtureControlConfig | undefined {
  return state.connectionSettings.atmospherics.fixtures[fixtureId]
}

function ensureAtmosphericsFixtureConfigMutable(
  state: DeviceState,
  fixtureId: string
): AtmosphericsFixtureControlConfig {
  const existing = findAtmosphericsFixtureConfig(state, fixtureId)
  if (existing !== undefined) {
    return existing
  }
  const created = initAtmosphericsFixtureControlConfig(fixtureId)
  state.connectionSettings.atmospherics.fixtures[fixtureId] = created
  return created
}

function ensureAtmosphericsTriggerChannelConfigMutable(
  fixture: AtmosphericsFixtureControlConfig,
  channelNumber: number
): AtmosphericsTriggerChannelConfig {
  const existing = fixture.triggerChannels[channelNumber]
  if (existing !== undefined) {
    return existing
  }
  const fallback = initAtmosphericsTriggerChannelConfig(channelNumber)
  fallback.threshold = fixture.threshold
  fallback.triggerAction = fixture.triggerAction
  fallback.delayMs = fixture.delayMs
  fallback.intervalMs = fixture.intervalMs
  fallback.pulseMs = fixture.pulseMs
  fallback.manualDelayMs = fixture.manualDelayMs
  fallback.manualIntervalMs = fixture.manualIntervalMs
  fixture.triggerChannels[channelNumber] = fallback
  return fallback
}

function ensureAtmosphericsLevelChannelConfigMutable(
  fixture: AtmosphericsFixtureControlConfig,
  channelNumber: number
): AtmosphericsLevelChannelConfig {
  const existing = fixture.levelChannels[channelNumber]
  if (existing !== undefined) {
    return existing
  }
  const fallback = initAtmosphericsLevelChannelConfig(channelNumber)
  fixture.levelChannels[channelNumber] = fallback
  return fallback
}

export const midiActions = {
  setButtonAction: (
    state: DeviceState,
    { payload }: PayloadAction<{ inputID: string; action: MidiAction }>
  ) => {
    clearInputID(state, payload.inputID)
    state.buttonActions[getActionID(payload.action)] = payload
  },
  setSliderAction: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      inputID: string
      action: MidiAction
      options: SliderControlOptions
    }>
  ) => {
    clearInputID(state, payload.inputID)
    state.sliderActions[getActionID(payload.action)] = {
      ...payload,
      options: normalizeSliderOptionsForAction(payload.action, payload.options),
    }
  },
  removeMidiAction: (
    state: DeviceState,
    { payload }: PayloadAction<MidiAction>
  ) => {
    const actionId = getActionID(payload)
    delete state.buttonActions[actionId]
    delete state.sliderActions[actionId]
  },
  listen: (state: DeviceState, { payload }: PayloadAction<MidiAction>) => {
    state.listening = payload
  },
  setIsEditing: (state: DeviceState, { payload }: PayloadAction<boolean>) => {
    delete state.listening
    state.isEditing = payload
  },
  setMidiConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<ConnectionId[]>
  ) => {
    state.connectable.midi = payload
  },
  setDmxConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<ConnectionId[]>
  ) => {
    state.connectable.dmx = payload
  },
  setArtNetConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<ConnectionId[]>
  ) => {
    state.connectable.artNet = payload
  },
  setOpenDmxRefreshRateHz: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    state.connectionSettings.openDmxRefreshRateHz = payload
  },
  setUniverseCount: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    const universeCount = clampUniverseCount(payload)
    state.connectionSettings.universeCount = universeCount
    state.connectionSettings.dmxUniverseByDevice = clampDeviceUniverseAssignments(
      state.connectionSettings.dmxUniverseByDevice,
      universeCount
    )
    state.connectionSettings.artNetIpByUniverse = clampArtNetRoutes(
      state.connectionSettings.artNetIpByUniverse,
      universeCount
    )
  },
  setDmxDeviceUniverse: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{ connectionId: ConnectionId; universe: number }>
  ) => {
    state.connectionSettings.dmxUniverseByDevice[payload.connectionId] =
      clampUniverseIndex(
        payload.universe,
        state.connectionSettings.universeCount
      )
  },
  setArtNetUniverseRoute: (
    state: DeviceState,
    { payload }: PayloadAction<{ universe: number; ip: string }>
  ) => {
    const universe = clampUniverseIndex(
      payload.universe,
      state.connectionSettings.universeCount
    )
    const ip = payload.ip.trim()
    if (ip.length === 0) {
      delete state.connectionSettings.artNetIpByUniverse[universe]
    } else {
      state.connectionSettings.artNetIpByUniverse[universe] = ip
    }
  },
  setAudioInputEnabled: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      enabled: payload === true,
    }
  },
  setAudioInputDeviceId: (
    state: DeviceState,
    { payload }: PayloadAction<string>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      deviceId: typeof payload === 'string' ? payload.trim() : '',
    }
  },
  setAudioInputGain: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      inputGain: normalizeAudioInputSettings({
        ...current,
        inputGain: payload,
      }).inputGain,
    }
  },
  setAudioBeatClockEnabled: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      useBeatClock: payload === true,
    }
    if (payload === true) {
      state.connectionSettings.midiClockBpmEnabled = false
    }
  },
  setMidiClockBpmEnabled: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    state.connectionSettings.midiClockBpmEnabled = payload === true
    if (payload === true) {
      const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
      state.connectionSettings.audioInput = {
        ...current,
        useBeatClock: false,
      }
    }
  },
  setAudioBeatSensitivity: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      beatSensitivity: normalizeAudioInputSettings({
        ...current,
        beatSensitivity: payload,
      }).beatSensitivity,
    }
  },
  setAudioBeatMinIntervalMs: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      beatMinIntervalMs: normalizeAudioInputSettings({
        ...current,
        beatMinIntervalMs: payload,
      }).beatMinIntervalMs,
    }
  },
  setAudioBpmSmoothing: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      bpmSmoothing: normalizeAudioInputSettings({
        ...current,
        bpmSmoothing: payload,
      }).bpmSmoothing,
    }
  },
  setAudioBeatTapHint: (
    state: DeviceState,
    { payload }: PayloadAction<{ bpm: number; atMs?: number }>
  ) => {
    const rawBpm = Number(payload.bpm)
    if (!Number.isFinite(rawBpm)) {
      return
    }
    const bpm = Math.min(220, Math.max(45, rawBpm))
    const atMs =
      payload.atMs != null && Number.isFinite(payload.atMs) && payload.atMs > 0
        ? payload.atMs
        : Date.now()
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      beatTapHintBpm: bpm,
      beatTapHintAtMs: atMs,
    }
  },
  clearAudioBeatTapHint: (state: DeviceState) => {
    const current = normalizeAudioInputSettings(state.connectionSettings.audioInput)
    state.connectionSettings.audioInput = {
      ...current,
      beatTapHintBpm: null,
      beatTapHintAtMs: 0,
    }
  },
  setAtmosphericsEnabled: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    withNormalizedAtmospherics(state)
    state.connectionSettings.atmospherics.enabled = payload === true
  },
  setAtmosphericsArmed: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    withNormalizedAtmospherics(state)
    state.connectionSettings.atmospherics.armed = payload === true
  },
  setAtmosphericsEmergencyStop: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    withNormalizedAtmospherics(state)
    state.connectionSettings.atmospherics.emergencyStop = payload === true
  },
  setAtmosphericsAllowPyro: (
    state: DeviceState,
    { payload }: PayloadAction<boolean>
  ) => {
    withNormalizedAtmospherics(state)
    state.connectionSettings.atmospherics.allowPyro = payload === true
  },
  setAtmosphericsGlobalLevelLimit: (
    state: DeviceState,
    { payload }: PayloadAction<number>
  ) => {
    withNormalizedAtmospherics(state)
    state.connectionSettings.atmospherics.globalLevelLimit = Math.min(
      1,
      Math.max(0, Number(payload) || 0)
    )
  },
  ensureAtmosphericsFixtureConfig: (
    state: DeviceState,
    { payload }: PayloadAction<string>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.trim()
    if (fixtureId.length <= 0) return
    if (state.connectionSettings.atmospherics.fixtures[fixtureId] === undefined) {
      state.connectionSettings.atmospherics.fixtures[fixtureId] =
        initAtmosphericsFixtureControlConfig(fixtureId)
    }
    state.connectionSettings.atmospherics.selectedFixtureId = fixtureId
  },
  removeAtmosphericsFixtureConfig: (
    state: DeviceState,
    { payload }: PayloadAction<string>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.trim()
    delete state.connectionSettings.atmospherics.fixtures[fixtureId]
    if (state.connectionSettings.atmospherics.selectedFixtureId === fixtureId) {
      const firstKey =
        Object.keys(state.connectionSettings.atmospherics.fixtures)[0] ?? null
      state.connectionSettings.atmospherics.selectedFixtureId = firstKey
    }
  },
  selectAtmosphericsFixture: (
    state: DeviceState,
    { payload }: PayloadAction<string | null>
  ) => {
    withNormalizedAtmospherics(state)
    if (payload === null) {
      state.connectionSettings.atmospherics.selectedFixtureId = null
      return
    }
    const fixtureId = payload.trim()
    const exists = state.connectionSettings.atmospherics.fixtures[fixtureId] !== undefined
    state.connectionSettings.atmospherics.selectedFixtureId = exists ? fixtureId : null
  },
  patchAtmosphericsFixtureConfig: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      fixtureId: string
      patch: Partial<
        Omit<
          AtmosphericsFixtureControlConfig,
          'fixtureId' | 'source' | 'auxChannels' | 'triggerChannels' | 'levelChannels'
        >
      >
    }>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.fixtureId.trim()
    const target = findAtmosphericsFixtureConfig(state, fixtureId)
    if (target === undefined) {
      return
    }
    if (payload.patch.enabled !== undefined) {
      target.enabled = payload.patch.enabled === true
    }
    if (payload.patch.groupName !== undefined) {
      const nextGroupName = payload.patch.groupName.trim()
      if (nextGroupName.length > 0) {
        target.groupName = nextGroupName
      }
    }
    if (payload.patch.threshold !== undefined) target.threshold = payload.patch.threshold
    if (payload.patch.hysteresis !== undefined) target.hysteresis = payload.patch.hysteresis
    if (payload.patch.triggerAction !== undefined)
      target.triggerAction = payload.patch.triggerAction
    if (payload.patch.delayMs !== undefined) target.delayMs = payload.patch.delayMs
    if (payload.patch.intervalMs !== undefined) target.intervalMs = payload.patch.intervalMs
    if (payload.patch.pulseMs !== undefined) target.pulseMs = payload.patch.pulseMs
    if (payload.patch.manualDelayMs !== undefined)
      target.manualDelayMs = payload.patch.manualDelayMs
    if (payload.patch.manualIntervalMs !== undefined)
      target.manualIntervalMs = payload.patch.manualIntervalMs
    state.connectionSettings.atmospherics.fixtures[fixtureId] =
      normalizeAtmosphericsFixtureControlConfig(target, fixtureId)
  },
  setAtmosphericsFixtureGroupName: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      fixtureId: string
      groupName: string
    }>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.fixtureId.trim()
    if (fixtureId.length <= 0) return
    const targetFixture = ensureAtmosphericsFixtureConfigMutable(state, fixtureId)
    const nextGroupName = payload.groupName.trim()
    if (nextGroupName.length > 0) {
      targetFixture.groupName = nextGroupName
    }
    state.connectionSettings.atmospherics.fixtures[fixtureId] =
      normalizeAtmosphericsFixtureControlConfig(targetFixture, fixtureId)
  },
  patchAtmosphericsFixtureTriggerChannelConfig: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      fixtureId: string
      channelNumber: number
      patch: Partial<AtmosphericsTriggerChannelConfig>
    }>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.fixtureId.trim()
    if (fixtureId.length <= 0) return
    const channelNumber = Math.max(1, Math.min(512, Math.round(payload.channelNumber)))
    const targetFixture = ensureAtmosphericsFixtureConfigMutable(state, fixtureId)
    const targetChannel = ensureAtmosphericsTriggerChannelConfigMutable(
      targetFixture,
      channelNumber
    )
    if (payload.patch.useGroupThreshold !== undefined) {
      targetChannel.useGroupThreshold = payload.patch.useGroupThreshold === true
    }
    if (payload.patch.threshold !== undefined) {
      targetChannel.threshold = payload.patch.threshold
    }
    if (payload.patch.triggerAction !== undefined) {
      targetChannel.triggerAction = payload.patch.triggerAction
    }
    if (payload.patch.delayMs !== undefined) {
      targetChannel.delayMs = payload.patch.delayMs
    }
    if (payload.patch.intervalMs !== undefined) {
      targetChannel.intervalMs = payload.patch.intervalMs
    }
    if (payload.patch.pulseMs !== undefined) {
      targetChannel.pulseMs = payload.patch.pulseMs
    }
    if (payload.patch.manualDelayMs !== undefined) {
      targetChannel.manualDelayMs = payload.patch.manualDelayMs
    }
    if (payload.patch.manualIntervalMs !== undefined) {
      targetChannel.manualIntervalMs = payload.patch.manualIntervalMs
    }
    targetFixture.triggerChannels[channelNumber] =
      normalizeAtmosphericsTriggerChannelConfig(targetChannel, channelNumber)
    state.connectionSettings.atmospherics.fixtures[fixtureId] =
      normalizeAtmosphericsFixtureControlConfig(targetFixture, fixtureId)
  },
  patchAtmosphericsFixtureLevelChannelConfig: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      fixtureId: string
      channelNumber: number
      patch: Partial<AtmosphericsLevelChannelConfig>
    }>
  ) => {
    withNormalizedAtmospherics(state)
    const fixtureId = payload.fixtureId.trim()
    if (fixtureId.length <= 0) return
    const channelNumber = Math.max(1, Math.min(512, Math.round(payload.channelNumber)))
    const targetFixture = ensureAtmosphericsFixtureConfigMutable(state, fixtureId)
    const targetChannel = ensureAtmosphericsLevelChannelConfigMutable(
      targetFixture,
      channelNumber
    )
    if (payload.patch.controlMode !== undefined) {
      targetChannel.controlMode = payload.patch.controlMode
    }
    if (payload.patch.manualValue !== undefined) {
      targetChannel.manualValue = payload.patch.manualValue
    }
    targetFixture.levelChannels[channelNumber] = normalizeAtmosphericsLevelChannelConfig(
      targetChannel,
      channelNumber
    )
    state.connectionSettings.atmospherics.fixtures[fixtureId] =
      normalizeAtmosphericsFixtureControlConfig(targetFixture, fixtureId)
  },
}

function clearInputID(state: DeviceState, inputID: string) {
  for (let [actionID, buttonAction] of Object.entries(state.buttonActions)) {
    if (buttonAction.inputID === inputID) delete state.buttonActions[actionID]
  }
  for (let [actionID, sliderAction] of Object.entries(state.sliderActions)) {
    if (sliderAction.inputID === inputID) delete state.sliderActions[actionID]
  }
}
