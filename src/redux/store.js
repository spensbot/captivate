import { configureStore } from '@reduxjs/toolkit'
import timeReducer from './timeSlice'
import paramsReducer from './paramsSlice'

export default configureStore({
  reducer: {
    time: timeReducer,
    params: paramsReducer
  }
})