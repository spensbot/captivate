import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { string, number, union, object, boolean, array, equal, map } from '../util/validate'
import { ParamKey } from '../engine/params'

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
type SliderControlOptions = SliderControl_cc | SliderControl_note

interface SetActiveSceneIndex {
  type: 'setActiveSceneIndex'
  index: number
}

// const setActiveSceneIndexSchema = object<SetActiveSceneIndex>({
//   type: equal('setActiveSceneIndex'),
//   index: number()
// })

interface SetAutoSceneBombacity {
  type: 'setAutoSceneBombacity'
}

// const setAutoSceneBombacitySchema = object<SetAutoSceneBombacity>({
//   type: equal('setAutoSceneBombacity')
// })

interface SetMaster {
  type: 'setMaster'
}
interface SetBpm {
  type: 'setBpm'
}

interface SetBaseParam {
  type: 'setBaseParam'
  paramKey: ParamKey
}

export type MidiAction = SetActiveSceneIndex | SetAutoSceneBombacity | SetMaster | SetBaseParam | SetBpm

// const midiActionSchema = union<MidiAction>(setActiveSceneIndexSchema, setAutoSceneBombacitySchema)

export function getActionID(action: MidiAction) {
  if (action.type === 'setActiveSceneIndex') {
    return action.type + action.index.toString()
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

// const midiActionControlledSchema = object<MidiActionControlled>({
//   inputID: string(),
//   action: midiActionSchema
// })

// ActionID = setAutoSceneBombacity, setActiveSceneIndex0, etc.
// InputID = note70, cc50, etc.
export interface MidiState {
  listening?: MidiAction
  isEditing: boolean
  // byInputID: { [inputID: string]: MidiActionControlled } 
  buttonActions: { [actionID: string]: ButtonAction },
  sliderActions: { [actionID: string]: SliderAction }
}

// export const midiStateSchema = object<MidiState>({
//   listening: midiActionSchema,
//   isEditing: boolean(),
//   byInputID: map(union(undefined, midiActionControlledSchema)),
//   byActionID: map(union(undefined, midiActionControlledSchema))
// })

export function initMidiState(): MidiState {
  return {
    isEditing: false,
    buttonActions: {},
    sliderActions: {}
  }
}

export const midiSlice = createSlice({
  name: 'midi',
  initialState: initMidiState(),
  reducers: {
    setButtonAction: (state, { payload }: PayloadAction<{ inputID: string, action: MidiAction }>) => {
      for (let [actionID, buttonAction] of Object.entries(state.buttonActions)) {
        if (buttonAction.inputID === payload.inputID) delete state.buttonActions[actionID]
      }
      state.buttonActions[getActionID(payload.action)] = payload
    },
    setSliderAction: (state, { payload }: PayloadAction<{ inputID: string, action: MidiAction, options: SliderControlOptions }>) => {
      for (let [actionID, sliderAction] of Object.entries(state.sliderActions)) {
        if (sliderAction.inputID === payload.inputID) delete state.sliderActions[actionID]
      }
      state.sliderActions[getActionID(payload.action)] = payload
    },
    listen: (state, { payload }: PayloadAction<MidiAction>) => {
      state.listening = payload
    },
    setIsEditing: (state, { payload }: PayloadAction<boolean>) => {
      delete state.listening
      state.isEditing = payload
    }
  },
})

export const {
  setButtonAction,
  setSliderAction,
  listen,
  setIsEditing
} = midiSlice.actions

export default midiSlice.reducer