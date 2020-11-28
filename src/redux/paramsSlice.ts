import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getDefaultParams } from '../engine/params';

type Payload = {
  param: any,
  value: string
}

export const paramsSlice = createSlice({
  name: 'params',
  initialState: getDefaultParams(),
  reducers: {
    setParam: (state, action: PayloadAction<Payload>) => {
      let param = action.payload.param
      state[param] = action.payload.value
    },
  },
});

export const { setParam } = paramsSlice.actions;

export default paramsSlice.reducer;