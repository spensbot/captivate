import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getDefaultParams, Param } from '../engine/params';

type ParamPayload = {[key: string]: number}

export const paramsSlice = createSlice({
  name: 'params',
  initialState: getDefaultParams(),
  reducers: {
    setParams: (state, action: PayloadAction<ParamPayload>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state[key] = value
      }
    },
  },
});

export const { setParams } = paramsSlice.actions;

export default paramsSlice.reducer;