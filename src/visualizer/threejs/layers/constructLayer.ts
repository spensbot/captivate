import Spheres from './Spheres'
import TextSpin from './TextSpin'
import Cubes from './Cubes'
import CubeSphere, { initCubeSphereConfig } from './CubeSphere'
import TextParticles from './TextParticles'
import LocalMedia from './LocalMedia'
import { LayerConfig } from './LayerConfig'
import LayerBase from './LayerBase'
import Random from './Random'
import Space from './Space'

//ADD LAYER!!!
export default function constructLayer(config: LayerConfig): LayerBase {
  if (config.type === 'CubeSphere') return new CubeSphere(config)
  if (config.type === 'Cubes') return new Cubes(config)
  if (config.type === 'Spheres') return new Spheres(config)
  if (config.type === 'TextParticles') return new TextParticles(config)
  if (config.type === 'TextSpin') return new TextSpin(config)
  if (config.type === 'LocalMedia') return new LocalMedia(config)
  if (config.type === 'Random') return new Random(config)
  if (config.type === 'Space') return new Space(config)
  console.error(`Missing constructor in constructLayer()`)
  return new CubeSphere(initCubeSphereConfig())
}
