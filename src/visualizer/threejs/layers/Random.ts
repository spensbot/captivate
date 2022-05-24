import * as THREE from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { randomRanged, indexArray } from '../../../shared/util'
import { snapToMultipleOf2, getMultiplier } from '../util/util'

const MIN_XY = -1000
const MAX_XY = 1000

export interface RandomConfig {
  type: 'Random'
  obeyEpicness: number
  count: number
  period: number
  shape: 'Cone' | 'Box' | 'Sphere' | 'Cylinder'
  width: number
  height: number
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
    count: 10000,
    period: 1,
    shape: 'Box',
    width: 1,
    height: 10,
  }
}

const dummy = new THREE.Object3D()

export default class Random extends LayerBase {
  mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  stars: THREE.InstancedMesh
  config: RandomConfig

  constructor(config: RandomConfig) {
    super()
    this.config = config
    this.stars = new THREE.InstancedMesh(
      makeGeometry(config),
      this.mat,
      config.count
    )
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.stars)
  }

  update(res: UpdateResource): void {
    let epicnessMultiplier = getMultiplier(
      res.scene.epicness,
      this.config.obeyEpicness
    )

    let count = Math.floor(this.config.count * epicnessMultiplier)
    let period = this.config.period / epicnessMultiplier
    let snappedPeriod = snapToMultipleOf2(period)

    console.log(
      `mult: ${epicnessMultiplier.toFixed(
        2
      )} | count: ${count} | period: ${period.toFixed(
        2
      )} | snapped: ${snappedPeriod}`
    )

    if (this.stars.count !== count) {
      this.reset_count
    }

    if (res.isNewPeriod(snappedPeriod)) {
      indexArray(this.stars.count).forEach((i) => {
        dummy.position.set(randomXY(), randomXY(), randomXY())
        dummy.updateMatrix()
        this.stars.setMatrixAt(i, dummy.matrix)
      })
      this.stars.instanceMatrix.needsUpdate = true
    }
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
      return new THREE.CylinderGeometry(
        config.width,
        config.width,
        config.height
      )
    case 'Sphere':
      return new THREE.SphereGeometry(config.width)
  }
}

function randomXY() {
  return randomRanged(MIN_XY, MAX_XY)
}
