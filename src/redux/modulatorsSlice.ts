import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lfo, GetSin, GetRamp, LfoShape } from '../engine/oscillator'
import {clampNormalized, clamp} from '../util/helpers'

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
    GetRamp()
  ],
  reducers: {
    setModulatorShape: (state, { payload }: PayloadAction<{index: number, shape: LfoShape}>) => {
      state[payload.index].shape = payload.shape
    },
    incrementPeriod: (state, { payload }: PayloadAction<{index: number, amount: number}>) => {
      state[payload.index].period = clamp(state[payload.index].period + payload.amount, 1, 4)
    },
    incrementModulator: (state, { payload }: PayloadAction<IncrementPayload>) => {
      state[payload.index].flip = clampNormalized(state[payload.index].flip + payload.flip)
      state[payload.index].phaseShift = clampNormalized(state[payload.index].phaseShift + payload.phaseShift)
      state[payload.index].skew = clampNormalized(state[payload.index].skew + payload.skew)
      state[payload.index].symmetricSkew = clampNormalized(state[payload.index].symmetricSkew + payload.symmetricSkew)
    },
    pushModulator: (state, { payload }: PayloadAction<Lfo>) => {
      state.push(payload)
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      state.splice(payload, 1)
    }
  },
});

export const { setModulatorShape, incrementPeriod, incrementModulator, pushModulator, removeModulator } = modulatorsSlice.actions;

export default modulatorsSlice.reducer;
