import { EffectConfig, EffectsConfig } from './effectConfigs'
import { LightSync } from './LightSync'
import { Glitch } from './Glitch'
import { AdaptiveToneMapping } from './AdaptiveToneMapping'
import { AfterImage } from './AfterImage'
import { DotScreen } from './DotScreen'
import { Film } from './Film'
import { HalfTone } from './HalfTone'
import { UnrealBloom } from './UnrealBloom'

type Effect =
  | AdaptiveToneMapping
  | AfterImage
  | DotScreen
  | Film
  | Glitch
  | HalfTone
  | LightSync
  | UnrealBloom

function makeEffect(config: EffectConfig): Effect {
  switch (config.type) {
    case 'AdaptiveToneMapping':
      return new AdaptiveToneMapping(config)
    case 'AfterImage':
      return new AfterImage(config)
    case 'DotScreen':
      return new DotScreen(config)
    case 'Film':
      return new Film(config)
    case 'Glitch':
      return new Glitch(config)
    case 'HalfTone':
      return new HalfTone(config)
    case 'LightSync':
      return new LightSync(config)
    case 'UnrealBloom':
      return new UnrealBloom(config)
  }
}

export default class EffectManager {
  effects: Effect[] = []
  config: EffectsConfig

  constructor(config: EffectsConfig) {
    this.config = config
  }

  updateConfig(config: EffectsConfig): void {
    this.config = config
  }
}
