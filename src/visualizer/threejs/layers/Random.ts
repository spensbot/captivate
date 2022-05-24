import * as THREE from 'three'
import { Vector3, Matrix4, Mesh } from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { randomRanged, zeroArray } from '../../../shared/util'

const MIN_XY = -1000
const MAX_XY = 1000
const MIN_Z = -5
const MAX_Z = 5
const MIN_SPEED = 100
const MAX_SPEED = 1000

export interface RandomConfig {
  type: 'Random'
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
  starPositions: [Vector3, Matrix4][]
  config: RandomConfig

  constructor(config: RandomConfig) {
    super()
    this.config = config
    this.stars = new THREE.InstancedMesh(
      makeGeometry(config),
      this.mat,
      config.count
    )
    this.starPositions = zeroArray(config.count).map((_) => {
      let position = new Vector3(randomXY(), randomXY(), 0)
      return [position, new Matrix4().setPosition(position)]
    })
    // this.starPositions.forEach(([_, m], i) => this.stars.setMatrixAt(i, m))
    // this.stars.instanceMatrix.needsUpdate = true
    // this.stars.matrixWorldNeedsUpdate = true
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.stars)
  }

  update(dt: number, res: UpdateResource): void {
    if (res.isNewPeriod(this.config.period)) {
      this.starPositions.forEach((_, i) => {
        dummy.position.set(randomXY(), randomXY(), randomXY())
        dummy.updateMatrix()
        this.stars.setMatrixAt(i, dummy.matrix)
      })
      this.stars.instanceMatrix.needsUpdate = true
    }
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
