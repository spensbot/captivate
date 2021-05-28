import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SetActiveSceneIndex {
  type: 'setActiveSceneIndex'
  index: number
}

interface SetAutoSceneBombacity {
  type: 'setAutoSceneBombacity'
  bombacity: number
}

export type MidiAction = SetActiveSceneIndex | SetAutoSceneBombacity

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

export interface MidiState {
  listening?: MidiAction
  isEditing: boolean
  byInputID: { [inputID: string]: MidiActionControlled | undefined } // note70, cc50, etc.
  byActionID: { [actionID: string]: MidiActionControlled | undefined } // setAutoSceneBombacity, setActiveSceneIndex0, etc.
}

const initialState: MidiState = {
  isEditing: false,
  byInputID: {},
  byActionID: {}
}

export const midiSlice = createSlice({
  name: 'midi',
  initialState: initialState,
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