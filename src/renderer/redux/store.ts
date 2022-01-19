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
import undoable from 'redux-undo'

const baseReducer = combineReducers({
  connections: connectionsReducer,
  dmx: undoable(dmxReducer),
  gui: guiReducer,
  scenes: undoable(scenesReducer),
  midi: undoable(midiReducer),
  mixer: mixerReducer,
})

export type ReduxState = ReturnType<typeof baseReducer>

const RESET_STATE = 'reset-state'

export function resetState(newState: ReduxState): PayloadAction<ReduxState> {
  return {
    type: RESET_STATE,
    payload: newState,
  }
}

const rootReducer: Reducer<ReduxState, PayloadAction<any>> = (
  state,
  action
) => {
  if (action.type === RESET_STATE) {
    return action.payload
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
