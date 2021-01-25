import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lfo, GetValue, GetSin, GetRamp } from '../engine/oscillator'

interface Payload {
  lfo: Lfo
  index: number
}

export const modulatorsSlice = createSlice({
  name: 'modulators',
  initialState: [
    GetSin(),
    GetRamp()
  ],
  reducers: {
    updateModulator: (state, { payload }: PayloadAction<Payload>) => {
      state[payload.index].shape = payload.lfo.shape
      state[payload.index].skew = payload.lfo.skew
      state[payload.index].symmetricSkew = payload.lfo.symmetricSkew
      state[payload.index].phaseShift = payload.lfo.phaseShift
      state[payload.index].flip = payload.lfo.flip
      state[payload.index].period = payload.lfo.period
    },
  },
});

export const { updateModulator } = modulatorsSlice.actions;

export default modulatorsSlice.reducer;
