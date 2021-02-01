import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lfo, GetSin, GetRamp, LfoShape } from '../engine/oscillator'
import { ParamKey, Params } from '../engine/params'
import { clampNormalized, clamp } from '../util/helpers'
import { initModulator } from '../engine/modulationEngine'

interface IncrementPayload {
  index: number
  flip: number
  phaseShift: number
  skew: number
  symmetricSkew: number
}

interface SetModulationPayload {
  index: number,
  param: ParamKey,
  value: number
}

export const modulatorsSlice = createSlice({
  name: 'modulators',
  initialState: [
    initModulator()
  ],
  reducers: {
    setModulatorShape: (state, { payload }: PayloadAction<{index: number, shape: LfoShape}>) => {
      state[payload.index].lfo.shape = payload.shape
    },
    incrementPeriod: (state, { payload }: PayloadAction<{ index: number, amount: number }>) => {
      state[payload.index].lfo.period = clamp(state[payload.index].lfo.period + payload.amount, 0.25, 16)
    },
    incrementModulator: (state, { payload }: PayloadAction<IncrementPayload>) => {
      state[payload.index].lfo.flip = clampNormalized(state[payload.index].lfo.flip + payload.flip)
      state[payload.index].lfo.phaseShift = clampNormalized(state[payload.index].lfo.phaseShift + payload.phaseShift)
      state[payload.index].lfo.skew = clampNormalized(state[payload.index].lfo.skew + payload.skew)
      state[payload.index].lfo.symmetricSkew = clampNormalized(state[payload.index].lfo.symmetricSkew + payload.symmetricSkew)
    },
    addModulator: (state, _: PayloadAction<void>) => {
      state.push(initModulator())
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      state.splice(payload, 1)
    },
    resetModulator: (state, { payload }: PayloadAction<number>) => {
      state[payload] = initModulator();
    },
    setModulation: (state, { payload }: PayloadAction<SetModulationPayload>) => {
      const {index, param, value} = payload
      state[index].modulation[param] = value
    }
  },
});

export const { setModulatorShape, incrementPeriod, incrementModulator, addModulator, removeModulator, setModulation, resetModulator } = modulatorsSlice.actions;

export default modulatorsSlice.reducer;
