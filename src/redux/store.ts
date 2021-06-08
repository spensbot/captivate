import { configureStore, combineReducers, Reducer, PayloadAction, createStore } from '@reduxjs/toolkit'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer from './dmxSlice'
import guiReducer from './guiSlice'
import scenesReducer from './scenesSlice'
import midiReducer from './midiSlice'

console.log('Running store.ts')
console.log("connectionsReducer", connectionsReducer)

const baseReducer = combineReducers({
  connections: connectionsReducer,
  dmx: dmxReducer,
  gui: guiReducer,
  scenes: scenesReducer,
  midi: midiReducer
})

export type ReduxState = ReturnType<typeof baseReducer>

const RESET_STATE = 'reset-state'

export function resetState(newState: ReduxState): PayloadAction<ReduxState> {
  return {
    type: RESET_STATE,
    payload: newState
  }
}

const rootReducer: Reducer<ReduxState, PayloadAction<any>> = (state, action) => {
  if (action.type === RESET_STATE) {
    return action.payload
  }
  return baseReducer(state, action)
}

export const store = createStore(rootReducer)

export type ReduxStore = typeof store
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector