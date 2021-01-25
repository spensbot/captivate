import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lfo, GetValue, GetSin, GetRamp } from '../engine/oscillator'
import {clampNormalized} from '../util/helpers'

interface UpdatePayload {
  lfo: Lfo
  index: number
}

interface IncrementPayload {
  index: number
  flip: number
  phaseShift: number
  skew: number
  symmetricSkew: number
}

export const modulatorsSlice = createSlice({
  name: 'modulators',
  initialState: [
    GetSin(),
    GetRamp()
  ],
  reducers: {
    updateModulator: (state, { payload }: PayloadAction<UpdatePayload>) => {
      state[payload.index].shape = payload.lfo.shape
      state[payload.index].skew = payload.lfo.skew
      state[payload.index].symmetricSkew = payload.lfo.symmetricSkew
      state[payload.index].phaseShift = payload.lfo.phaseShift
      state[payload.index].flip = payload.lfo.flip
      state[payload.index].period = payload.lfo.period
    },
    incrementModulator: (state, { payload }: PayloadAction<IncrementPayload>) => {
      state[payload.index].flip = clampNormalized(state[payload.index].flip + payload.flip)
      state[payload.index].phaseShift = clampNormalized(state[payload.index].phaseShift + payload.phaseShift)
      state[payload.index].skew = clampNormalized(state[payload.index].skew + payload.skew)
      state[payload.index].symmetricSkew = clampNormalized(state[payload.index].symmetricSkew + payload.symmetricSkew)
    }
  },
});

export const { updateModulator, incrementModulator } = modulatorsSlice.actions;

export default modulatorsSlice.reducer;
