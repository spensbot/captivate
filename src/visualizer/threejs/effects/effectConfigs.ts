import { LayerConfig, initLayerConfig } from '../layers/LayerConfig'

export interface AdaptiveToneMappingConfig {
  type: 'AdaptiveToneMapping'
}
export function initAdaptiveToneMappingConfig(): AdaptiveToneMappingConfig {
  return { type: 'AdaptiveToneMapping' }
}
export interface AfterImageConfig {
  type: 'AfterImage'
  damp: number
}
export function initAfterImageConfig(): AfterImageConfig {
  return { type: 'AfterImage', damp: 0.9 }
}
export interface DotScreenConfig {
  type: 'DotScreen'
  centerX: number
  centerY: number
  angle: number
  scale: number
}
export function initDotScreenConfig(): DotScreenConfig {
  return { type: 'DotScreen', centerX: 0, centerY: 0, angle: 0, scale: 1 }
}
export interface FilmConfig {
  type: 'Film'
  intensity: number // combines noiseIntensity & scanlinesIntensity
  scanlines: number
  grayscale: boolean
}
export function initFilmConfig(): FilmConfig {
  return {
    type: 'Film',
    intensity: 0.5,
    scanlines: 100,
    grayscale: true,
  }
}
export interface GlitchConfig {
  type: 'Glitch'
}
export function initGlitchConfig(): GlitchConfig {
  return { type: 'Glitch' }
}
export interface HalfToneConfig {
  type: 'HalfTone'
  radius: number
  scatter: number
  shape: number
}
export function initHalfToneConfig(): HalfToneConfig {
  return { type: 'HalfTone', radius: 1, scatter: 1, shape: 0 }
}
export interface LightSyncConfig {
  type: 'LightSync'
  obeyColor: number
  obeyBrightness: boolean
  obeyMaster: boolean
  obeyPosition: boolean
  obeyStrobe: boolean
  obeyEpicness: boolean
}
export function initLightSyncConfig(): LightSyncConfig {
  return {
    type: 'LightSync',
    obeyColor: 1.0,
    obeyBrightness: true,
    obeyMaster: true,
    obeyPosition: true,
    obeyStrobe: true,
    obeyEpicness: true,
  }
}
export interface PixelConfig {
  type: 'Pixel'
  pixelSize: number // 1 to 64
}
export function initPixelConfig(): PixelConfig {
  return {
    type: 'Pixel',
    pixelSize: 16,
  }
}
export interface RenderLayerConfig {
  type: 'RenderLayer'
  layerConfig: LayerConfig
}
export function initRenderLayerConfig(): RenderLayerConfig {
  return {
    type: 'RenderLayer',
    layerConfig: initLayerConfig('CubeSphere'),
  }
}
export interface UnrealBloomConfig {
  type: 'UnrealBloom'
  strength: number
  radius: number
  threshold: number
}

export function initUnrealBloomConfig(): UnrealBloomConfig {
  return { type: 'UnrealBloom', strength: 0.5, radius: 1, threshold: 0.5 }
}

export type EffectConfig =
  | AdaptiveToneMappingConfig
  | AfterImageConfig
  | DotScreenConfig
  | FilmConfig
  | GlitchConfig
  | HalfToneConfig
  | LightSyncConfig
  | PixelConfig
  | RenderLayerConfig
  | UnrealBloomConfig

export type EffectType = EffectConfig['type']

export type EffectsConfig = EffectConfig[]

export function initEffectsConfig(): EffectsConfig {
  return []
}

export function initEffectConfig(type: EffectConfig['type']): EffectConfig {
  switch (type) {
    case 'AdaptiveToneMapping':
      return initAdaptiveToneMappingConfig()
    case 'AfterImage':
      return initAfterImageConfig()
    case 'DotScreen':
      return initDotScreenConfig()
    case 'Film':
      return initFilmConfig()
    case 'Glitch':
      return initGlitchConfig()
    case 'HalfTone':
      return initHalfToneConfig()
    case 'LightSync':
      return initLightSyncConfig()
    case 'Pixel':
      return initPixelConfig()
    case 'UnrealBloom':
      return initUnrealBloomConfig()
    case 'RenderLayer':
      return initRenderLayerConfig()
    default:
      console.error(`Missing initEffectConfig()`)
      return initPixelConfig()
  }
}

export const effectTypes: EffectType[] = [
  // 'AdaptiveToneMapping', <-- This doesn't always perform in a desireable way so removing for now
  'AfterImage',
  'DotScreen',
  'Film',
  'Glitch',
  'HalfTone',
  'LightSync',
  'Pixel',
  // 'RenderLayer', <-- Removing RenderLayer until I can find a way to render multiple renderlayer's on top of each other :/
  // ... I tried so hard
  'UnrealBloom',
]
