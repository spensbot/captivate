import { SpheresConfig, initSpheresConfig } from './Spheres'
import { TextSpinConfig, initTextSpinConfig } from './TextSpinConfig'
import { CubesConfig, initCubesConfig } from './Cubes'
import { CubeSphereConfig, initCubeSphereConfig } from './CubeSphere'
import {
  TextParticlesConfig,
  initTextParticlesConfig,
} from './TextParticlesConfig'
import { LocalMediaConfig, initLocalMediaConfig } from './LocalMediaConfig'
import { initSpaceConfig, SpaceConfig } from './Space'

//ADD LAYER!!!
export type LayerConfig =
  | SpheresConfig
  | TextSpinConfig
  | CubesConfig
  | CubeSphereConfig
  | TextParticlesConfig
  | LocalMediaConfig
  | SpaceConfig

export type VisualizerType = LayerConfig['type']

//ADD LAYER!!!
export const visualizerTypeList: VisualizerType[] = [
  'CubeSphere',
  // 'Cubes',
  'Spheres',
  'TextParticles',
  'TextSpin',
  'LocalMedia',
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
  if (type === 'Space') return initSpaceConfig()
  console.error(`Missing default config in initLayerConfig()`)
  return initCubeSphereConfig()
}

//ADD LAYER!!!
export const layerDisplayNames: { [key in VisualizerType]: string } = {
  CubeSphere: 'Cube Sphere',
  Cubes: 'Cubes',
  Spheres: 'Spheres',
  TextParticles: 'Text Particles',
  TextSpin: 'Text',
  LocalMedia: 'Local Media',
  Space: 'Space',
} as const

export function layerTypeFromDisplayName(searchFor: string): VisualizerType {
  for (let [type, displayName] of Object.entries(layerDisplayNames)) {
    let layerType = type as VisualizerType
    if (displayName === searchFor) {
      return layerType
    }
  }
  console.error(`layerTypeFromDisplayName() bad displayName`)
  return 'Space'
}
