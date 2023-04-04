import * as THREE from 'three'
import LayerBase from './LayerBase'
import { randomRanged } from '../../../../math/util'
import { skewPower } from '../../../../math/skew'
import { Vector3 } from 'three'
import { Strobe } from '../util/animations'
import { colorFromHSV } from '../util/util'
import UpdateResource from '../UpdateResource'

export interface CubesConfig {
  type: 'Cubes'
  minSize: number
  maxSize: number
}

export function initCubesConfig(): CubesConfig {
  return {
    type: 'Cubes',
    minSize: 1,
    maxSize: 1.5,
  }
}

class RandomCube {
  private mesh: THREE.Mesh
  private axis: Vector3
  private material = new THREE.MeshStandardMaterial()

  constructor(config: CubesConfig, scene: THREE.Scene, x: number, y: number) {
    const size = randomRanged(config.minSize, config.maxSize)
    const geometry = new THREE.BoxGeometry(size, size, size)
    this.axis = new Vector3(x, y, 0).normalize()
    geometry.translate(x, y, 0)
    this.mesh = new THREE.Mesh(geometry, this.material)
    scene.add(this.mesh)
  }

  update({ dt, scene }: UpdateResource) {
    const epicness = scene.epicness
    this.mesh.rotateOnAxis(
      this.axis,
      (dt * skewPower(epicness, 0.6) + 0.5) / 200
    )
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}

export default class Cubes extends LayerBase {
  private cubes: RandomCube[]
  private light: THREE.PointLight
  private strobe: Strobe = new Strobe()

  constructor(config: CubesConfig) {
    super()

    this.light = new THREE.PointLight()
    this.light.position.z = 5
    this.scene.add(this.light)

    const cols = 12
    const rows = 8
    this.cubes = []
    for (const col of Array(cols).keys()) {
      for (const row of Array(rows).keys()) {
        const x = col - cols / 2
        const y = row - rows / 2
        this.cubes.push(new RandomCube(config, this.scene, x, y))
      }
    }
  }

  update(res: UpdateResource): void {
    this.cubes.forEach((cube) => cube.update(res))
    this.light.position.x = res.params.x ?? 0.5 * 10 - 5
    this.light.position.y = res.params.y ?? 0.5 * 8 - 4
    this.light.intensity = this.strobe.update(res.dt, res.params.strobe ?? 0)
    this.light.color = new THREE.Color(
      colorFromHSV(
        res.params.hue ?? 0,
        res.params.saturation ?? 0,
        res.params.brightness ?? 0
      )
    )
  }

  dispose() {
    this.cubes.forEach((cube) => cube.dispose())
    this.light.dispose()
  }
}
