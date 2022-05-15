import Spheres from './Spheres'
import TextSpin from './TextSpin'
import Cubes from './Cubes'
import CubeSphere from './CubeSphere'
import TextParticles from './TextParticles'
import LocalMedia from './LocalMedia'
import { LayerConfig } from './LayerConfig'
import LayerBase from './LayerBase'

export default function constructLayer(config: LayerConfig): LayerBase {
  if (config.type === 'CubeSphere') return new CubeSphere(config)
  if (config.type === 'Cubes') return new Cubes(config)
  if (config.type === 'Spheres') return new Spheres(config)
  if (config.type === 'TextParticles') return new TextParticles(config)
  if (config.type === 'TextSpin') return new TextSpin(config)
  if (config.type === 'LocalMedia') return new LocalMedia(config)
  return new Spheres(config)
}
