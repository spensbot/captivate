import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initParams, Params, ParamKey, initParamsModulation, PartialParams, ParamsModulation } from '../engine/params';
import {clampNormalized, clamp} from '../util/helpers'

interface SetModulationPayload {
  param: ParamKey,
  modulatorIndex: number | null
}

export const paramsSlice = createSlice({
  name: 'params',
  initialState: {
    base: initParams(),
    output: initParams(),
    modulation: initParamsModulation()
  },
  reducers: {
    setBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state.base[key] = value
      }
    },
    incrementBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        state.base[key] = clamp(state.base[key] + value, 0.1, 1.0)
      }
    },
    setOutputParams: (state, {payload}: PayloadAction<Params>) => {
      state.output.Hue = payload.Hue
      state.output.Saturation = payload.Saturation
      state.output.Brightness = payload.Brightness
      state.output.X = payload.X
      state.output.Width = payload.Width
      state.output.Y = payload.Y
      state.output.Height = payload.Height
    },
    setModulation: (state, {payload}: PayloadAction<SetModulationPayload>) => {
      state.modulation[payload.param] = payload.modulatorIndex
    }
  },
});

export const { setOutputParams, setBaseParams, incrementBaseParams, setModulation } = paramsSlice.actions;

export default paramsSlice.reducer;