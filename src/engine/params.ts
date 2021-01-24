import { Normalized } from '../types/baseTypes'

export type Blackout = "Blackout" | "No Blackout"

// export type Param2 =
//   | "Hue"
//   | "Saturation"
//   | "Brightness"
//   | "Black"
//   | "X"
//   | "Y"
//   | "X_Width"
//   | "Y_Width"
//   | "Epicness"
//   | "Strobe"
//   | "Blackout"

export enum ParamKey {
  Hue = "Hue",
  Saturation = "Saturation",
  Brightness = "Brightness",
  Black = "Black",
  X = "X",
  Y = "Y",
  X_Width = "X_Width",
  Y_Width = "Y_Width",
  Epicness = "Epicness",
  Strobe = "Strobe",
  Blackout = "Blackout"
}

export interface Param {
  baseValue: Normalized
  value: Normalized
  modulator?: number
}

const initParam: Param = {
  baseValue: 0,
  value: 0
}

export type Params = { [key in ParamKey]: Param }

export type PartialParams = { [key in ParamKey]?: Param }

export function getDefaultParams(): Params {
  return {
    [ParamKey.Hue]: initParam,
    [ParamKey.Saturation]: initParam,
    [ParamKey.Brightness]: {
      baseValue: 0,
      value: 0,
      modulator: 0
    },
    [ParamKey.X]: initParam,
    [ParamKey.X_Width]: initParam,

    // I'm not gonna worry about these until later :p
    [ParamKey.Epicness]: initParam,
    [ParamKey.Strobe]: initParam,
    [ParamKey.Blackout]: initParam,
    [ParamKey.Y]: initParam,
    [ParamKey.Y_Width]: initParam,
    [ParamKey.Black]: initParam,
  }
}