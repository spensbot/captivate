import * as THREE from 'three'
import { Vector3 } from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { randomRanged, mapFn, Range, rLerp } from '../../../shared/util'
import { snapToMultipleOf2 } from '../util/util'

const MIN_XY = -2000
const MAX_XY = 2000
const MIN_Z = -2000
const MAX_Z = 100

export interface SpaceConfig {
  type: 'Space'
  count: Range
  speed: Range
  randomize: Range
  shape: 'Box' | 'Sphere' | 'Cylinder'
  width: number
  height: number
}

export const spaceShapes: SpaceConfig['shape'][] = ['Box', 'Cylinder', 'Sphere']

export function initSpaceConfig(): SpaceConfig {
  return {
    type: 'Space',
    count: { min: 0.25, max: 0.75 },
    speed: { min: 0.0, max: 0.5 },
    randomize: { min: 0.0, max: 0.0 },
    shape: 'Cylinder',
    width: 0.5,
    height: 0.5,
  }
}

const mapRandomize = mapFn(4, { max: 100 })
const mapSpeed = mapFn(2, { max: 10 })
const mapCount = mapFn(3, { min: 1, max: 50000 })
const mapWidth = mapFn(2, { min: 0, max: 200 })
const mapHeight = mapFn(2, { min: 0, max: 200 })

const dummy = new THREE.Object3D()

export default class Space extends LayerBase {
  mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  stars = new THREE.InstancedMesh(undefined, undefined, 0)
  positions: Vector3[] = []
  config: SpaceConfig

  constructor(config: SpaceConfig) {
    super()
    this.config = config
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0008)
  }

  update(res: UpdateResource): void {
    let config = this.config
    let epicness = res.scene.epicness

    let count = mapCount(rLerp(config.count, epicness))
    let speed = mapSpeed(rLerp(config.speed, epicness))
    let randomize = mapRandomize(rLerp(config.randomize, epicness))
    let period = 1 / randomize
    let snappedPeriod = snapToMultipleOf2(period)

    if (this.stars.count !== count) {
      this.reset(count)
    }

    if (res.isNewPeriod(snappedPeriod)) {
      this.positions = this.positions.map((_) => spawnPosition())
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

  reset(count: number) {
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

    while (this.positions.length < count) {
      this.positions.push(spawnPosition())
    }
    this.positions.splice(count - 1)
  }

  dispose() {
    this.mat.dispose()
    this.stars.geometry.dispose()
    this.stars.dispose()
  }
}

function makeGeometry(config: SpaceConfig) {
  let width = mapWidth(config.width)
  let height = mapHeight(config.height)

  switch (config.shape) {
    case 'Box':
      return new THREE.BoxGeometry(width, height, width)
    case 'Cylinder':
      let geo = new THREE.CylinderGeometry(width, width, height)
      geo.rotateX(Math.PI / 2)
      return geo
    case 'Sphere':
      return new THREE.SphereGeometry(width)
  }
}

function randomXY() {
  return randomRanged(MIN_XY, MAX_XY)
}

function spawnPosition() {
  return new Vector3(randomXY(), randomXY(), randomRanged(MIN_Z, MAX_Z))
}
