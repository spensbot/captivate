import { AdaptiveToneMapping } from './AdaptiveToneMapping'
import { AfterImage } from './AfterImage'
import { DotScreen } from './DotScreen'
import { Film } from './Film'
import { Glitch } from './Glitch'
import { HalfTone } from './HalfTone'
import { LightSync } from './LightSync'
import { Pixel } from './Pixel'
import { RenderLayer } from './RenderLayer'
import { UnrealBloom } from './UnrealBloom'
import { EffectConfig } from './effectConfigs'

export type Effect =
  | AdaptiveToneMapping
  | AfterImage
  | DotScreen
  | Film
  | Glitch
  | HalfTone
  | LightSync
  | Pixel
  | RenderLayer
  | UnrealBloom

export function constructEffect(config: EffectConfig): Effect {
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
    case 'Pixel':
      return new Pixel(config)
    case 'UnrealBloom':
      return new UnrealBloom(config)
    case 'RenderLayer':
      return new RenderLayer(config, false)
  }
}
