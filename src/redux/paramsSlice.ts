import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getDefaultParams, Params, ParamKey } from '../engine/params';

type BaseValuePayload = { [key in ParamKey]?: number }

export const paramsSlice = createSlice({
  name: 'params',
  initialState: getDefaultParams(),
  reducers: {
    setBaseParams: (state, action: PayloadAction<BaseValuePayload>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state[key].baseValue = value
        if (!state[key].modulator === undefined) { state[key].value = value }
      }
    },
    setParams: (state, action: PayloadAction<Params>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state[key].baseValue = value.baseValue
        state[key].value = value.value
        state[key].modulator = value.modulator
      }
    },
  },
});

export const { setParams, setBaseParams } = paramsSlice.actions;

export default paramsSlice.reducer;