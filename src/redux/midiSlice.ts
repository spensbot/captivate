import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { string, number, union, object, boolean, array, equal, map } from '../util/validate'

interface SetActiveSceneIndex {
  type: 'setActiveSceneIndex'
  index: number
}

const setActiveSceneIndexSchema = object<SetActiveSceneIndex>({
  type: equal('setActiveSceneIndex'),
  index: number()
})

interface SetAutoSceneBombacity {
  type: 'setAutoSceneBombacity'
  bombacity: number
}

const setAutoSceneBombacitySchema = object<SetAutoSceneBombacity>({
  type: equal('setAutoSceneBombacity'),
  bombacity: number()
})

export type MidiAction = SetActiveSceneIndex | SetAutoSceneBombacity

const midiActionSchema = union<MidiAction>(setActiveSceneIndexSchema, setAutoSceneBombacitySchema)

export function getActionID(action: MidiAction) {
  if (action.type === 'setActiveSceneIndex') {
    return action.type + action.index.toString()
  }
  return action.type
}

export interface MidiActionControlled {
  inputID: string
  action: MidiAction
}

const midiActionControlledSchema = object<MidiActionControlled>({
  inputID: string(),
  action: midiActionSchema
})

export interface MidiState {
  listening?: MidiAction
  isEditing: boolean
  byInputID: { [inputID: string]: MidiActionControlled | undefined } // note70, cc50, etc.
  byActionID: { [actionID: string]: MidiActionControlled | undefined } // setAutoSceneBombacity, setActiveSceneIndex0, etc.
}

export const midiStateSchema = object<MidiState>({
  listening: midiActionSchema,
  isEditing: boolean(),
  byInputID: map(union(undefined, midiActionControlledSchema)),
  byActionID: map(union(undefined, midiActionControlledSchema))
})

export function initMidiState(): MidiState {
  return {
    isEditing: false,
    byInputID: {},
    byActionID: {}
  }
}

export const midiSlice = createSlice({
  name: 'midi',
  initialState: initMidiState(),
  reducers: {
    addAction: (state, { payload }: PayloadAction<MidiActionControlled>) => {
      state.byInputID[payload.inputID] = payload
      state.byActionID[getActionID(payload.action)] = payload
    },
    listen: (state, { payload }: PayloadAction<MidiAction>) => {
      state.listening = payload
    },
    stopListening: (state, { payload }: PayloadAction<undefined>) => {
      delete state.listening
    },
    setIsEditing: (state, { payload }: PayloadAction<boolean>) => {
      state.isEditing = payload
    }
  },
})

export const {
  addAction,
  listen,
  stopListening,
  setIsEditing
} = midiSlice.actions

export default midiSlice.reducer