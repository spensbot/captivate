import * as THREE from 'three'
import LayerBase from './LayerBase'
import { randomRanged } from '../../../shared/util'
import { Vector3 } from 'three'
import UpdateResource from '../UpdateResource'
import { Skew } from '../../../shared/oscillator'

export interface CubeSphereConfig {
  type: 'CubeSphere'
  quantity: number
  size: number
}

export function initCubeSphereConfig(): CubeSphereConfig {
  return {
    type: 'CubeSphere',
    quantity: 20,
    size: 3,
  }
}

class RandomCube {
  mesh: THREE.Mesh
  material = new THREE.MeshNormalMaterial()
  axis: Vector3

  constructor(scene: THREE.Scene, config: CubeSphereConfig) {
    const size = config.size //randomRanged(5, 5)
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

  update(dt: number, { scene }: UpdateResource) {
    this.mesh.rotateOnAxis(
      this.axis,
      (dt * (Skew(scene.epicness, 0.6) + 0.5)) / 10000
    )
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
    this.cubes = Array(config.quantity)
      .fill(0)
      .map((_) => new RandomCube(this.scene, config))
  }

  update(dt: number, res: UpdateResource): void {
    this.cubes.forEach((cube) => cube.update(dt, res))
  }

  dispose() {
    this.cubes.forEach((cube) => cube.dispose())
  }
}
