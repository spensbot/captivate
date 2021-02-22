import { configureStore } from '@reduxjs/toolkit'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer from './dmxSlice'
import guiReducer from './guiSlice'
import scenesReducer from './scenesSlice'

export const store = configureStore({
  reducer: {
    connections: connectionsReducer,
    dmx: dmxReducer,
    gui: guiReducer,
    scenes: scenesReducer
  }
})

export type ReduxStore = typeof store
export type ReduxState = ReturnType<typeof store.getState>
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector