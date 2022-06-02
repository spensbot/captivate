import * as THREE from 'three'
import LayerBase from './LayerBase'
import { randomRanged } from '../../../math/util'
import { skewPower3 } from '../../../math/skew'
import { Strobe } from '../util/animations'
import { colorFromHSV } from '../util/util'
import UpdateResource from '../UpdateResource'
import { indexArray } from '../../../shared/util'
import { mapFn } from '../../../shared/util'

const RATIO_MIN = 0.02
const RATIO_MAX = 0.1

export interface SpheresConfig {
  type: 'Spheres'
  quantity: number
  radius: number
}

export function initSpheresConfig(): SpheresConfig {
  return {
    type: 'Spheres',
    quantity: 0.5,
    radius: 0.5,
  }
}

const mapQty = mapFn(3, { max: 500 })
const mapRadius = mapFn(1.5, { max: 6 })

export default class Spheres extends LayerBase {
  private globe: THREE.Mesh
  private globeMaterial: THREE.MeshBasicMaterial
  private spots: THREE.Mesh[]
  private spotMaterial: THREE.MeshBasicMaterial
  private strobe = new Strobe()

  constructor(config: SpheresConfig) {
    super()
    this.globeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
    this.globe = new THREE.Mesh(
      new THREE.SphereGeometry(mapRadius(config.radius), 40, 40),
      this.globeMaterial
    )
    this.scene.add(this.globe)

    this.spotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    this.spots = indexArray(mapQty(config.quantity)).map((_) => {
      const r = randomRanged(RATIO_MIN, RATIO_MAX) * mapRadius(config.radius)
      const geometry = new THREE.SphereGeometry(r, 15, 15)
      geometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(0, mapRadius(config.radius), 0)
      )
      const spot = new THREE.Mesh(geometry, this.spotMaterial)
      spot.rotation.x = randomRanged(0, 100)
      spot.rotation.y = randomRanged(0, 100)
      spot.rotation.z = randomRanged(0, 100)
      this.scene.add(spot)
      return spot
    })
  }

  update({ dt, params, scene }: UpdateResource): void {
    const epicness = scene.epicness

    const color = colorFromHSV(
      params.hue,
      params.saturation / 2,
      params.brightness * epicness * this.strobe.update(dt, params.strobe)
    )

    this.globeMaterial.color = new THREE.Color(color)

    const dr = (dt / 500) * (skewPower3(epicness, 0.6) + 0.01)
    this.spots.forEach((spot) => {
      spot.rotation.x += dr
      spot.rotation.y += dr
      spot.rotation.z += dr
    })
  }

  dispose() {
    this.globe.geometry.dispose()
    this.globeMaterial.dispose()
    this.spots.forEach((spot) => spot.geometry.dispose())
    this.spotMaterial.dispose()
  }
}
