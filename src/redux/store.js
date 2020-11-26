import { configureStore } from '@reduxjs/toolkit'
import timeReducer from './timeSlice'
import paramsReducer from './paramsSlice'
import connectionReducer from './connectionSlice'

export default configureStore({
  reducer: {
    time: timeReducer,
    params: paramsReducer,
    connections: connectionReducer
  }
})