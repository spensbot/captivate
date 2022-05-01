import { Vector2 } from 'three'

export interface AdaptiveToneMapping {
  type: 'AdaptiveToneMapping'
}
export interface Afterimage {
  type: 'Afterimage'
  damp: number
}
// export interface Bloom {
//   type: 'Bloom'
// }
// export interface Bokeh {
//   type: 'Bokeh'
// }
// export interface Clear {
//   type: 'Clear'
// }
// export interface CubeTexture {
//   type: 'CubeTexture'
// }
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
export interface LightSync {
  type: 'LightSync'
  obeyColor: boolean
  obeyBrightness: boolean
  obeyMaster: boolean
  obeyPosition: boolean
  obeyStrobe: boolean
  obeyEpicness: boolean
}
// export interface LUT {
//   type: 'LUT'
// }
// export interface Mask {
//   type: 'Mask'
// }
// export interface Outline {
//   type: 'Outline'
// }
// export interface SAO {
//   type: 'SAO'
// }
// export interface SMAA {
//   type: 'SMAA'
// }
// export interface SSAO {
//   type: 'SSAO'
// }
// export interface SSR {
//   type: 'SSR'
// }
// export interface Save {
//   type: 'Save'
// }
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
  | LightSync
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

export function initEffectConfig(type: EffectConfig['type']): EffectConfig {
  switch (type) {
    case 'AdaptiveToneMapping':
      return {
        type: 'AdaptiveToneMapping',
      }
    case 'Afterimage':
      return {
        type: 'Afterimage',
        damp: 1.0,
      }
    case 'DotScreen':
      return {
        type: 'DotScreen',
        center: new Vector2(0.0, 0.0),
        scale: 1.0,
        angle: 0.0,
      }
    case 'Film':
      return {
        type: 'Film',
      }
    case 'Glitch':
      return {
        type: 'Glitch',
        dt: 16,
      }
    case 'Halftone':
      return {
        type: 'Halftone',
      }
    case 'LightSync':
      return {
        type: 'LightSync',
        obeyColor: false,
        obeyBrightness: false,
        obeyMaster: false,
        obeyPosition: false,
        obeyStrobe: false,
        obeyEpicness: false,
      }
    case 'UnrealBloom':
      return {
        type: 'UnrealBloom',
      }
  }
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
  'LightSync',
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
