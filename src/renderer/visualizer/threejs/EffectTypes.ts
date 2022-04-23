import { Vector2 } from 'three'

export interface AdaptiveToneMapping {
  type: 'AdaptiveToneMapping'
}
export interface Afterimage {
  type: 'Afterimage'
  damp: number
}
export interface Bloom {
  type: 'Bloom'
}
export interface Bokeh {
  type: 'Bokeh'
}
export interface Clear {
  type: 'Clear'
}
export interface CubeTexture {
  type: 'CubeTexture'
}
export interface DotScreen {
  type: 'DotScreen'
  center: Vector2
  angle: number
  scale: number
}
export interface Film {
  type: 'Film'
}
export interface Glitch {
  type: 'Glitch'
  dt: number
}
export interface Halftone {
  type: 'Halftone'
}
export interface LUT {
  type: 'LUT'
}
export interface Mask {
  type: 'Mask'
}
export interface Outline {
  type: 'Outline'
}
export interface SAO {
  type: 'SAO'
}
export interface SMAA {
  type: 'SMAA'
}
export interface SSAO {
  type: 'SSAO'
}
export interface SSR {
  type: 'SSR'
}
export interface Save {
  type: 'Save'
}
export interface UnrealBloom {
  type: 'UnrealBloom'
}

export type EffectConfig =
  | AdaptiveToneMapping
  | Afterimage
  // | Bloom
  // | Bokeh
  // | Clear
  // | CubeTexture
  | DotScreen
  | Film
  | Glitch
  | Halftone
  // | LUT
  // | Mask
  // | Outline
  // | SAO
  // | SMAA
  // | SSAO
  // | SSR
  // | Save
  | UnrealBloom

export type EffectType = EffectConfig['type']

export type EffectsConfig = EffectConfig[]

export function initEffectsConfig(): EffectsConfig {
  return []
}

export const effectTypes: EffectType[] = [
  'AdaptiveToneMapping',
  'Afterimage',
  // 'Bloom', <-- Does nothing?
  // 'Bokeh',
  // 'Clear', <-- Does nothing?
  // 'CubeTexture',
  'DotScreen',
  'Film',
  'Glitch',
  'Halftone',
  // 'LUT', <-- Does nothing?
  // 'Mask',
  // 'Outline',
  // 'SAO',
  // 'SMAA', <-- Does nothing?
  // 'SSAO',
  // 'SSR',
  // 'Save',
  'UnrealBloom',
]
