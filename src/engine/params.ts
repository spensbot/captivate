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

export function initParams(): Params {
  return {
    [ParamKey.Hue]: 0.5,
    [ParamKey.Saturation]: 0.5,
    [ParamKey.Brightness]: 0.5,
    [ParamKey.X]: 0.5,
    [ParamKey.Width]: 0.5,
    [ParamKey.Y]: 0.5,
    [ParamKey.Height]: 1.0,
    [ParamKey.Black]: 0.5
  }
}

export function initModulation(): Params {
  return {
    [ParamKey.Hue]: 0.5,
    [ParamKey.Saturation]: 0.5,
    [ParamKey.Brightness]: 0.5,
    [ParamKey.X]: 0.5,
    [ParamKey.Width]: 0.5,
    [ParamKey.Y]: 0.5,
    [ParamKey.Height]: 0.5,
    [ParamKey.Black]: 0.5
  }
}

export const paramsList = [
  ParamKey.Hue,
  ParamKey.Saturation,
  ParamKey.Brightness,
  ParamKey.X,
  ParamKey.Width,
  ParamKey.Y,
  ParamKey.Height,
  ParamKey.Black
]