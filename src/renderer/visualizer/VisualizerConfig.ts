import VisualizerBase from './VisualizerBase'
import Spheres, { SpheresConfig, initSpheresConfig } from './Spheres'
import TextSpin, { TextSpinConfig, initTextSpinConfig } from './TextSpin'
import Cubes, { CubesConfig, initCubesConfig } from './Cubes'
import CubeSphere, {
  CubeSphereConfig,
  initCubeSphereConfig,
} from './CubeSphere'
import TextParticles, {
  TextParticlesConfig,
  initTextParticlesConfig,
} from './TextParticles'

export type VisualizerConfig =
  | SpheresConfig
  | TextSpinConfig
  | CubesConfig
  | CubeSphereConfig
  | TextParticlesConfig

export type VisualizerType = VisualizerConfig['type']

export const visualizerTypeList: VisualizerType[] = [
  'CubeSphere',
  'Cubes',
  'Spheres',
  'TextParticles',
  'TextSpin',
]

export function initVisualizerConfig(type: VisualizerType): VisualizerConfig {
  if (type === 'CubeSphere') return initCubeSphereConfig()
  if (type === 'Cubes') return initCubesConfig()
  if (type === 'Spheres') return initSpheresConfig()
  if (type === 'TextParticles') return initTextParticlesConfig()
  if (type === 'TextSpin') return initTextSpinConfig()
  return initCubesConfig()
}

export function constructVisualizer(config: VisualizerConfig): VisualizerBase {
  if (config.type === 'CubeSphere') return new CubeSphere()
  if (config.type === 'Cubes') return new Cubes()
  if (config.type === 'Spheres') return new Spheres()
  if (config.type === 'TextParticles') return new TextParticles(config)
  if (config.type === 'TextSpin') return new TextSpin()
  return new Spheres()
}
