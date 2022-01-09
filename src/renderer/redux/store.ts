import {
  configureStore,
  combineReducers,
  Reducer,
  PayloadAction,
} from '@reduxjs/toolkit'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer from './dmxSlice'
import guiReducer from './guiSlice'
import scenesReducer from './scenesSlice'
import midiReducer from './midiSlice'
import mixerReducer from './mixerSlice'

const baseReducer = combineReducers({
  connections: connectionsReducer,
  dmx: dmxReducer,
  gui: guiReducer,
  scenes: scenesReducer,
  midi: midiReducer,
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
