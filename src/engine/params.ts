import { Normalized } from '../types/baseTypes'

export type Blackout = "Blackout" | "No Blackout"

export enum ParamKey {
  Hue = "Hue",
  Saturation = "Saturation",
  Brightness = "Brightness",
  X = "X",
  Width = "Width",
  Y = "Y",
  Height = "Height",
  Black = "Black",
  
  // I'm not gonna worry about these until later :p
  // Epicness = "Epicness",
  // Strobe = "Strobe"
}

export type Params = { [key in ParamKey]: Normalized }

export type PartialParams = { [key in ParamKey]?: Normalized }

export type ParamsModulation = { [key in ParamKey]: number | null }

export function initParams(): Params {
  return {
    [ParamKey.Hue]: 0.0,
    [ParamKey.Saturation]: 0.0,
    [ParamKey.Brightness]: 0.0,
    [ParamKey.X]: 0.0,
    [ParamKey.Width]: 0.0,
    [ParamKey.Y]: 0.0,
    [ParamKey.Height]: 0.0,
    [ParamKey.Black]: 0.0
  }
}

export function initParamsModulation(): ParamsModulation {
  return {
    [ParamKey.Hue]: null,
    [ParamKey.Saturation]: null,
    [ParamKey.Brightness]: null,
    [ParamKey.X]: null,
    [ParamKey.Width]: null,
    [ParamKey.Y]: null,
    [ParamKey.Height]: null,
    [ParamKey.Black]: null
  }
}