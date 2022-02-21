import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { random } from '../../../shared/util'
import { Skew } from '../../../shared/oscillator'
import { Strobe, colorFromHSV } from './animations'

const RADIUS = 2
const RATIO_MIN = 0.02
const RATIO_MAX = 0.1

export interface SpheresConfig {
  type: 'Spheres'
}

export function initSpheresConfig(): SpheresConfig {
  return {
    type: 'Spheres',
  }
}

export default class Spheres extends VisualizerBase {
  private globe: THREE.Mesh
  private globeMaterial: THREE.MeshBasicMaterial
  private spots: THREE.Mesh[]
  private spotMaterial: THREE.MeshBasicMaterial
  private strobe: Strobe = new Strobe()

  constructor() {
    super()
    this.globeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
    this.globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 40, 40),
      this.globeMaterial
    )
    this.scene.add(this.globe)

    this.spotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    this.spots = Array(50)
      .fill(0)
      .map((_) => {
        const r = random(RATIO_MIN, RATIO_MAX) * RADIUS
        const geometry = new THREE.SphereGeometry(r, 15, 15)
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, RADIUS, 0))
        const spot = new THREE.Mesh(geometry, this.spotMaterial)
        spot.rotation.x = random(100)
        spot.rotation.y = random(100)
        spot.rotation.z = random(100)
        this.scene.add(spot)
        return spot
      })
  }

  update(dt: number, { params, scene }: UpdateResource): void {
    const bombacity = scene.bombacity

    const color = colorFromHSV(
      params.hue,
      params.saturation / 2,
      params.brightness * bombacity * this.strobe.update(dt, params.strobe)
    )

    this.globeMaterial.color = new THREE.Color(color)

    const dr = (dt / 500) * (Skew(bombacity, 0.6) + 0.01)
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
