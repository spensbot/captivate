import { PayloadAction } from '@reduxjs/toolkit'
import { DefaultParam } from '../../shared/params'
import { SceneType } from '.../../shared/Scenes'
import { ConnectionId } from '../../shared/connection'
import { DMX_MAX_UNIVERSES } from '../../shared/dmxFixtures'

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

interface ConnectionSettings {
  openDmxRefreshRateHz: number
  universeCount: number
  dmxUniverseByDevice: { [connectionId: string]: number }
  artNetIpByUniverse: { [universe: number]: string }
}

export const buttonMidiActionTypes: Set<MidiAction['type']> = new Set([
  'setActiveSceneIndex',
  'tapTempo',
  'toggleAutoScene',
])

export type MidiAction =
  | SetActiveSceneIndex
  | SetAutoSceneBombacity
  | SetMaster
  | SetBaseParam
  | SetBpm
  | TapTempo
  | ToggleAutoScene

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
    },
  }
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
}

function clearInputID(state: DeviceState, inputID: string) {
  for (let [actionID, buttonAction] of Object.entries(state.buttonActions)) {
    if (buttonAction.inputID === inputID) delete state.buttonActions[actionID]
  }
  for (let [actionID, sliderAction] of Object.entries(state.sliderActions)) {
    if (sliderAction.inputID === inputID) delete state.sliderActions[actionID]
  }
}
