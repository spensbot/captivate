import {
  configureStore,
  combineReducers,
  Reducer,
  PayloadAction,
} from '@reduxjs/toolkit'
import connectionsReducer, { ConnectionsState } from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer, { DmxState } from './dmxSlice'
import guiReducer, { GuiState } from './guiSlice'
import scenesReducer, { SceneState } from './scenesSlice'
import { Scene_t } from '../../engine/scene_t'
import midiReducer, { MidiState } from './midiSlice'
import mixerReducer, { MixerState } from './mixerSlice'
import undoable, { StateWithHistory } from 'redux-undo'

export interface UndoActionTypes {
  undo: string
  redo: string
}

export type UndoGroup = 'dmx' | 'scenes' | 'midi'

export const undoActionTypes: { [key in UndoGroup]: UndoActionTypes } = {
  dmx: {
    undo: 'DMX_UNDO',
    redo: 'DMX_REDO',
  },
  scenes: {
    undo: 'SCENES_UNDO',
    redo: 'SCENES_REDO',
  },
  midi: {
    undo: 'MIDI_UNDO',
    redo: 'MIDI_REDO',
  },
} as const

const baseReducer = combineReducers({
  connections: connectionsReducer,
  dmx: undoable(dmxReducer, {
    undoType: undoActionTypes.dmx.undo,
    redoType: undoActionTypes.dmx.redo,
  }),
  gui: guiReducer,
  scenes: undoable(scenesReducer, {
    undoType: undoActionTypes.scenes.undo,
    redoType: undoActionTypes.scenes.redo,
  }),
  midi: undoable(midiReducer, {
    undoType: undoActionTypes.midi.undo,
    redoType: undoActionTypes.midi.redo,
  }),
  mixer: mixerReducer,
})

export type ReduxState = ReturnType<typeof baseReducer>

const RESET_STATE = 'reset-state'

export function resetState(
  newState: CleanReduxState
): PayloadAction<CleanReduxState> {
  return {
    type: RESET_STATE,
    payload: newState,
  }
}

function initUndoState<State>(present: State): StateWithHistory<State> {
  return {
    past: [],
    present: present,
    future: [],
  }
}

const rootReducer: Reducer<ReduxState, PayloadAction<any>> = (
  state,
  action
) => {
  if (action.type === RESET_STATE) {
    const cs: CleanReduxState = action.payload
    return {
      connections: cs.connections,
      dmx: initUndoState(cs.dmx),
      gui: cs.gui,
      scenes: initUndoState(cs.scenes),
      midi: initUndoState(cs.midi),
      mixer: cs.mixer,
    }
  }
  return baseReducer(state, action)
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
})

export type ReduxStore = typeof store
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector

export function getCleanReduxState(state: ReduxState) {
  return {
    connections: state.connections,
    dmx: state.dmx.present,
    gui: state.gui,
    scenes: state.scenes.present,
    midi: state.midi.present,
    mixer: state.mixer,
  }
}

export type CleanReduxState = ReturnType<typeof getCleanReduxState>

export function useScenesSelector<T>(getVal: (scenes: SceneState) => T) {
  return useTypedSelector((state) => getVal(state.scenes.present))
}

export function useActiveScene<T>(getVal: (scene: Scene_t) => T) {
  return useTypedSelector((state) =>
    getVal(state.scenes.present.byId[state.scenes.present.active])
  )
}

export function useDmxSelector<T>(getVal: (dmx: DmxState) => T) {
  return useTypedSelector((state) => getVal(state.dmx.present))
}

export function useMidiSelector<T>(getVal: (midi: MidiState) => T) {
  return useTypedSelector((state) => getVal(state.midi.present))
}
