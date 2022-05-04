import { GlitchConfig, initGlitchConfig } from './Glitch'
import { LightSyncConfig, initLightSyncConfig } from './LightSync'
import { UnrealBloomConfig, initUnrealBloomConfig } from './UnrealBloom'
import {
  AdaptiveToneMappingConfig,
  initAdaptiveToneMappingConfig,
} from './AdaptiveToneMapping'
import { AfterImageConfig, initAfterImageConfig } from './AfterImage'
import { DotScreenConfig, initDotScreenConfig } from './DotScreen'
import { FilmConfig, initFilmConfig } from './Film'
import { HalfToneConfig, initHalfToneConfig } from './HalfTone'

export type EffectConfig =
  | AdaptiveToneMappingConfig
  | AfterImageConfig
  | DotScreenConfig
  | FilmConfig
  | GlitchConfig
  | HalfToneConfig
  | LightSyncConfig
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
    case 'UnrealBloom':
      return initUnrealBloomConfig()
  }
}

export const effectTypes: EffectType[] = [
  'AdaptiveToneMapping',
  'AfterImage',
  'DotScreen',
  'Film',
  'Glitch',
  'HalfTone',
  'LightSync',
  'UnrealBloom',
]
