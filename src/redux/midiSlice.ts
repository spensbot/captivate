import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MidiActionBase {
  control: string
}

interface SetActiveSceneIndex extends MidiActionBase {
  type: 'setActiveSceneIndex'
  index: number
}

interface SetAutoSceneBombacity extends MidiActionBase {
  type: 'setAutoSceneBombacity'
  bombacity: number
}

type MidiAction = SetActiveSceneIndex | SetAutoSceneBombacity

type MidiState = {
  listening?: MidiAction
  byControl: { [source: string]: MidiAction } // note70, cc50, etc.
  byActionType: {
    setActiveSceneIndex: SetActiveSceneIndex[]
    setAutoSceneBombacity?: SetAutoSceneBombacity
  }
}

const initialState: MidiState = {
  byControl: {},
  byActionType: {
    setActiveSceneIndex: [],
  }
}

export const midiSlice = createSlice({
  name: 'midi',
  initialState: initialState,
  reducers: {
    addSetActiveSceneIndex: (state, { payload }: PayloadAction<SetActiveSceneIndex>) => {
      state.byControl[payload.control] = payload
      state.byActionType.setActiveSceneIndex[payload.index] = payload
    },
    addSetAutoSceneBombacity: (state, { payload }: PayloadAction<SetAutoSceneBombacity>) => {
      state.byControl[payload.control] = payload
      state.byActionType.setAutoSceneBombacity = payload
    },
    listen: (state, { payload }: PayloadAction<MidiAction>) => {
      state.listening = payload
    },
    stopListening: (state, { payload }: PayloadAction<undefined>) => {
      delete state.listening
    }
  },
});

export const {
  addSetActiveSceneIndex,
  addSetAutoSceneBombacity,
  listen,
  stopListening
} = midiSlice.actions;

export default midiSlice.reducer;