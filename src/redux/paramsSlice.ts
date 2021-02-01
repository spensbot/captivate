import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initParams, PartialParams } from '../engine/params';
import { clampNormalized } from '../util/helpers'

export const paramsSlice = createSlice({
  name: 'baseParams',
  initialState: initParams(),
  reducers: {
    setBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state[key] = value
      }
    },
    incrementBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state[key] = clampNormalized(state[key] + value)
      }
    }
  }
});

export const { setBaseParams, incrementBaseParams } = paramsSlice.actions;

export default paramsSlice.reducer;