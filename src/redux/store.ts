import { configureStore, combineReducers, Reducer, PayloadAction } from '@reduxjs/toolkit'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer from './dmxSlice'
import guiReducer from './guiSlice'
import scenesReducer from './scenesSlice'

const baseReducer = combineReducers({
  connections: connectionsReducer,
  dmx: dmxReducer,
  gui: guiReducer,
  scenes: scenesReducer
})

export type ReduxState = ReturnType<typeof baseReducer>

const RESET_STATE = 'reset-state'

export function resetState(newState: ReduxState): PayloadAction<ReduxState> {
  return {
    type: RESET_STATE,
    payload: newState
  }
}

const rootReducer: Reducer = (state: ReduxState, action) => {
  if (action.type === RESET_STATE) {
    state = action.payload
  }
  baseReducer(state, action)
}

export const store = configureStore({
  reducer: baseReducer
})

export type ReduxStore = typeof store
// export type ReduxState = ReturnType<typeof store.getState>
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector