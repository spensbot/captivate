import * as THREE from 'three'
import { Vector3 } from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { randomRanged, indexArray, zeroArray } from '../../../shared/util'
import { snapToMultipleOf2, getMultiplier } from '../util/util'

const MIN_XY = -2000
const MAX_XY = 2000
const MAX_Z = 0
const MIN_Z = -2000

export interface RandomConfig {
  type: 'Random'
  obeyEpicness: number
  count: number
  randomize: number
  shape: 'Cone' | 'Box' | 'Sphere' | 'Cylinder'
  width: number
  height: number
  speed: number
}

export const randomShapes: RandomConfig['shape'][] = [
  'Box',
  'Cone',
  'Cylinder',
  'Sphere',
]

export function initRandomConfig(): RandomConfig {
  return {
    type: 'Random',
    obeyEpicness: 0.5,
    count: 5000,
    randomize: 0,
    shape: 'Cylinder',
    width: 1,
    height: 20,
    speed: 0.5,
  }
}

const dummy = new THREE.Object3D()

export default class Random extends LayerBase {
  mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  stars: THREE.InstancedMesh
  positions: Vector3[]
  config: RandomConfig

  constructor(config: RandomConfig) {
    super()
    this.mat.fog = true
    this.config = config
    this.stars = new THREE.InstancedMesh(
      makeGeometry(config),
      this.mat,
      config.count
    )
    this.positions = zeroArray(config.count).map(
      (_) => new Vector3(randomXY(), randomXY(), randomRanged(MIN_Z, MAX_Z))
    )
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.stars)
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0008)
  }

  update(res: UpdateResource): void {
    let epicnessMultiplier = getMultiplier(
      res.scene.epicness,
      this.config.obeyEpicness
    )

    let count = Math.floor(this.config.count * epicnessMultiplier)
    let randomize = this.config.randomize * epicnessMultiplier
    let period = 0.25 / randomize
    let snappedPeriod = snapToMultipleOf2(period)
    let speed = this.config.speed * epicnessMultiplier

    console.log(
      `speed${speed.toFixed(2)} | mult: ${epicnessMultiplier.toFixed(
        2
      )} | count: ${count} | period: ${period.toFixed(
        2
      )} | snapped: ${snappedPeriod}`
    )

    if (this.stars.count !== count) {
      this.reset_count
    }

    if (res.isNewPeriod(snappedPeriod)) {
      this.positions = this.positions.map(
        (_) => new Vector3(randomXY(), randomXY(), randomRanged(MIN_Z, MAX_Z))
      )
      // indexArray(this.stars.count).forEach((i) => {
      //   dummy.position.set(randomXY(), randomXY(), randomRanged(MIN_Z, MAX_Z))
      //   dummy.updateMatrix()
      //   this.stars.setMatrixAt(i, dummy.matrix)
      // })
    }

    this.positions.forEach((p, i) => {
      // p.z += 10
      p.z += speed * res.dt
      if (p.z > MAX_Z) {
        p.z = MIN_Z
        p.x = randomXY()
        p.y = randomXY()
      }
      dummy.position.set(p.x, p.y, p.z)
      dummy.updateMatrix()
      this.stars.setMatrixAt(i, dummy.matrix)
    })

    this.stars.instanceMatrix.needsUpdate = true
  }

  reset_count(count: number) {
    this.scene.remove(this.stars)
    this.stars.geometry.dispose()
    this.stars.dispose()

    this.stars = new THREE.InstancedMesh(
      makeGeometry(this.config),
      this.mat,
      count
    )
    this.positions = zeroArray(this.config.count).map(
      (_) => new Vector3(randomXY(), randomXY(), randomRanged(MIN_Z, MAX_Z))
    )
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.stars)
  }

  dispose() {
    this.mat.dispose()
    this.stars.geometry.dispose()
    this.stars.dispose()
  }
}

function makeGeometry(config: RandomConfig) {
  switch (config.shape) {
    case 'Box':
      return new THREE.BoxGeometry(config.width, config.height, config.width)
    case 'Cone':
      return new THREE.ConeGeometry(config.width, config.height)
    case 'Cylinder':
      let geo = new THREE.CylinderGeometry(
        config.width,
        config.width,
        config.height
      )
      geo.rotateX(Math.PI / 2)
      return geo
    case 'Sphere':
      return new THREE.SphereGeometry(config.width)
  }
}

function randomXY() {
  return randomRanged(MIN_XY, MAX_XY)
}
