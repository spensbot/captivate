import * as THREE from 'three'
import LayerBase from './LayerBase'
import { Vector3 } from 'three'
import UpdateResource from '../UpdateResource'
import { randomRanged } from '../../../utils/math/util'
import { Range, rLerp } from '../../../utils/math/range'
import { mapFn } from '../../../../shared/util'

export interface CubeSphereConfig {
  type: 'CubeSphere'
  quantity: number
  size: number
  speed: Range
}

export function initCubeSphereConfig(): CubeSphereConfig {
  return {
    type: 'CubeSphere',
    quantity: 0.35,
    size: 0.7,
    speed: { min: 0.2, max: 0.5 },
  }
}

const mapQuantity = mapFn(3, { min: 1, max: 500 })
const mapSize = mapFn(1, { min: 0.1, max: 4 })
const mapSpeed = mapFn(3, { max: 0.01 })

class RandomCube {
  mesh: THREE.Mesh
  material = new THREE.MeshNormalMaterial()
  axis: Vector3
  config: CubeSphereConfig

  constructor(scene: THREE.Scene, config: CubeSphereConfig) {
    this.config = config
    const size = mapSize(config.size)
    const geometry = new THREE.BoxGeometry(size, size, size)
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.rotation.x = randomRanged(0, 100)
    this.mesh.rotation.y = randomRanged(0, 100)
    this.mesh.rotation.z = randomRanged(0, 100)
    const x = randomRanged(-3, 3)
    const y = randomRanged(-2, 2)
    geometry.translate(0, 0, 0)
    this.axis = new Vector3(x, y, 0).normalize()
    scene.add(this.mesh)
  }

  update({ dt, scene }: UpdateResource) {
    let speed = mapSpeed(rLerp(this.config.speed, scene.epicness))
    this.mesh.rotateOnAxis(this.axis, dt * speed)
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}

export default class CubeSphere extends LayerBase {
  private cubes: RandomCube[]

  constructor(config: CubeSphereConfig) {
    super()
    const quantity = mapQuantity(config.quantity)
    this.cubes = Array(Math.floor(quantity))
      .fill(0)
      .map((_) => new RandomCube(this.scene, config))
  }

  update(res: UpdateResource): void {
    this.cubes.forEach((cube) => cube.update(res))
  }

  dispose() {
    this.cubes.forEach((cube) => cube.dispose())
  }
}
