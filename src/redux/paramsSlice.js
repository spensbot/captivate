import { createSlice } from '@reduxjs/toolkit';
import { getDefaultParams } from '../engine/params';

export const paramsSlice = createSlice({
  name: 'params',
  initialState: getDefaultParams(),
  reducers: {
    setParam: (state, action) => {
      param = action.payload.param
      state[param] = action.payload.value
    },
  },
});

export const { setParam } = paramsSlice.actions;

export default paramsSlice.reducer;