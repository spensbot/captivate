import { configureStore } from '@reduxjs/toolkit'
import timeReducer from './timeSlice'
import paramsReducer from './paramsSlice'
import connectionsReducer from './connectionsSlice'

export default configureStore({
  reducer: {
    time: timeReducer,
    params: paramsReducer,
    connections: connectionsReducer
  }
})