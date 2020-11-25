import { Normalized } from './baseTypes'

export type Blackout = "Blackout" | "No Blackout"

export enum Param {
  Hue = "Hue",
  Saturation = "Saturation",
  Brightness = "Brightness",
  Black = "Black",
  Position = "Position",
  Size = "Size",
  X = "X",
  Y = "Y",
  X_Width = "X_Width",
  Y_Width = "Y_Width",
  Epicness = "Epicness",
  Strobe = "Strobe",
  Blackout = "Blackout"
}

export type Params = {
  [Param.Hue]: Normalized
  [Param.Saturation]: Normalized
  [Param.Brightness]: Normalized
  [Param.Black]: Normalized
  [Param.X]: Normalized
  [Param.X_Width]: Normalized
  [Param.Y]: Normalized
  [Param.Y_Width]: Normalized
  [Param.Epicness]: Normalized
  [Param.Strobe]: Boolean
  [Param.Blackout]: Boolean
}

export function getDefaultParams(): Params {
  return {
    [Param.Hue]: 0.0,
    [Param.Saturation]: 0.0,
    [Param.Brightness]: 0.0,
    [Param.Black]: 0.0,
    [Param.X]: 0.0,
    [Param.X_Width]: 0.0,
    [Param.Y]: 0.0,
    [Param.Y_Width]: 0.0,
    [Param.Epicness]: 0.0,
    [Param.Strobe]: false,
    [Param.Blackout]: false
  }
}