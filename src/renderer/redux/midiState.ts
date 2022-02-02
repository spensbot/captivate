import { PayloadAction } from '@reduxjs/toolkit'
import { Param } from '../../shared/params'
import { SceneType } from '.../../shared/Scenes'

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
export interface MidiState {
  listening?: MidiAction
  isEditing: boolean
  buttonActions: { [actionID: string]: ButtonAction }
  sliderActions: { [actionID: string]: SliderAction }
}

export function initMidiState(): MidiState {
  return {
    isEditing: false,
    buttonActions: {},
    sliderActions: {},
  }
}

export const midiActions = {
  setButtonAction: (
    state: MidiState,
    { payload }: PayloadAction<{ inputID: string; action: MidiAction }>
  ) => {
    clearInputID(state, payload.inputID)
    state.buttonActions[getActionID(payload.action)] = payload
  },
  setSliderAction: (
    state: MidiState,
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
  listen: (state: MidiState, { payload }: PayloadAction<MidiAction>) => {
    state.listening = payload
  },
  setIsEditing: (state: MidiState, { payload }: PayloadAction<boolean>) => {
    delete state.listening
    state.isEditing = payload
  },
}

function clearInputID(state: MidiState, inputID: string) {
  for (let [actionID, buttonAction] of Object.entries(state.buttonActions)) {
    if (buttonAction.inputID === inputID) delete state.buttonActions[actionID]
  }
  for (let [actionID, sliderAction] of Object.entries(state.sliderActions)) {
    if (sliderAction.inputID === inputID) delete state.sliderActions[actionID]
  }
}

// export const midiSlice = createSlice({
//   name: 'midi',
//   initialState: initMidiState(),
//   reducers: {},
// })

// export const { setButtonAction, setSliderAction, listen, setIsEditing } =
//   midiSlice.actions

// export default midiSlice.reducer
