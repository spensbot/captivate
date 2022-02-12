import { PayloadAction } from '@reduxjs/toolkit'
import { Param } from '../../shared/params'
import { SceneType } from '.../../shared/Scenes'
import { DeviceId } from '../../shared/connection'

interface Range {
  min: number
  max: number
}
interface SliderControl_cc extends Range {
  type: 'cc'
}
interface SliderControl_note extends Range {
  type: 'note'
  value: 'velocity' | 'max'
  mode: 'toggle' | 'hold'
}
export type SliderControlOptions = SliderControl_cc | SliderControl_note

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
  paramKey: Param
}

export type MidiAction =
  | SetActiveSceneIndex
  | SetAutoSceneBombacity
  | SetMaster
  | SetBaseParam
  | SetBpm

// must uniquely identify an action (for use in a hash table)
// does not need to be human readable. Just unique for a given action
export function getActionID(action: MidiAction) {
  if (action.type === 'setActiveSceneIndex') {
    return action.type + action.sceneType + action.index.toString()
  }
  if (action.type === 'setBaseParam') {
    return action.type + action.paramKey
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
    midi: DeviceId[]
    dmx: DeviceId[]
  }
  buttonActions: { [actionID: string]: ButtonAction }
  sliderActions: { [actionID: string]: SliderAction }
}

export function initDeviceState(): DeviceState {
  return {
    isEditing: false,
    buttonActions: {},
    sliderActions: {},
    connectable: {
      midi: [],
      dmx: [],
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
    state.sliderActions[getActionID(payload.action)] = payload
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
    { payload }: PayloadAction<DeviceId[]>
  ) => {
    state.connectable.midi = payload
  },
  setDmxConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<DeviceId[]>
  ) => {
    state.connectable.dmx = payload
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

// export const midiSlice = createSlice({
//   name: 'midi',
//   initialState: initDeviceState(),
//   reducers: {},
// })

// export const { setButtonAction, setSliderAction, listen, setIsEditing } =
//   midiSlice.actions

// export default midiSlice.reducer
