import { configureStore } from '@reduxjs/toolkit'
import timeReducer from './timeSlice'
import paramsReducer from './paramsSlice'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'

export const store = configureStore({
  reducer: {
    time: timeReducer,
    params: paramsReducer,
    connections: connectionsReducer
  }
})

export type ReduxStore = typeof store
export type ReduxState = ReturnType<typeof store.getState>
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector