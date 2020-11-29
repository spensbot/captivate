import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getDefaultParams, Param } from '../engine/params';

type ParamPayload = {
  param: Param,
  value: string
}

export const paramsSlice = createSlice({
  name: 'params',
  initialState: getDefaultParams(),
  reducers: {
    setParam: (state, action: PayloadAction<ParamPayload>) => {
      let param = action.payload.param
      state[param] = action.payload.value
    },
  },
});

export const { setParam } = paramsSlice.actions;

export default paramsSlice.reducer;