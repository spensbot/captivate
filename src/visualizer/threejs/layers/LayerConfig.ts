import { SpheresConfig, initSpheresConfig } from './Spheres'
import { TextSpinConfig, initTextSpinConfig } from './TextSpinConfig'
import { CubesConfig, initCubesConfig } from './Cubes'
import { CubeSphereConfig, initCubeSphereConfig } from './CubeSphere'
import {
  TextParticlesConfig,
  initTextParticlesConfig,
} from './TextParticlesConfig'
import { LocalMediaConfig, initLocalMediaConfig } from './LocalMediaConfig'
import { RandomConfig, initRandomConfig } from './Random'
import { initSpaceConfig, SpaceConfig } from './Space'

//ADD LAYER!!!
export type LayerConfig =
  | SpheresConfig
  | TextSpinConfig
  | CubesConfig
  | CubeSphereConfig
  | TextParticlesConfig
  | LocalMediaConfig
  | RandomConfig
  | SpaceConfig

export type VisualizerType = LayerConfig['type']

//ADD LAYER!!!
export const visualizerTypeList: VisualizerType[] = [
  'CubeSphere',
  'Cubes',
  'Spheres',
  'TextParticles',
  'TextSpin',
  'LocalMedia',
  'Random',
  'Space',
]

//ADD LAYER!!!
export function initLayerConfig(type: VisualizerType): LayerConfig {
  if (type === 'CubeSphere') return initCubeSphereConfig()
  if (type === 'Cubes') return initCubesConfig()
  if (type === 'Spheres') return initSpheresConfig()
  if (type === 'TextParticles') return initTextParticlesConfig()
  if (type === 'TextSpin') return initTextSpinConfig()
  if (type === 'LocalMedia') return initLocalMediaConfig()
  if (type === 'Random') return initRandomConfig()
  if (type === 'Space') return initSpaceConfig()
  console.error(`Missing default config in initLayerConfig()`)
  return initCubeSphereConfig()
}
