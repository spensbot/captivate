import * as THREE from 'three'
import { Vector3 } from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { randomRanged, zeroArray } from '../../../shared/util'

const MIN_XY = -1000
const MAX_XY = 1000

export interface SpaceConfig {
  type: 'Space'
  obeyEpicness: number
  count: number
  speed: number
  thickness: number
  length: number
}

export function initSpaceConfig(): SpaceConfig {
  return {
    type: 'Space',
    obeyEpicness: 0.5,
    count: 10000,
    speed: 100,
    thickness: 1,
    length: 100,
  }
}

const dummy = new THREE.Object3D()

export default class Space extends LayerBase {
  mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  stars: THREE.InstancedMesh
  starPositions: Vector3[]
  config: SpaceConfig

  constructor(config: SpaceConfig) {
    super()
    this.config = config
    this.stars = new THREE.InstancedMesh(
      makeGeometry(config),
      this.mat,
      config.count
    )
    this.starPositions = zeroArray(config.count).map(
      (_) => new Vector3(randomXY(), randomXY(), 0)
    )
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.stars)
  }

  update(res: UpdateResource): void {
    this.starPositions.forEach((position, i) => {
      position.z += res.dt
      dummy.position.set(randomXY(), randomXY(), randomXY())
      dummy.updateMatrix()
      this.stars.setMatrixAt(i, dummy.matrix)
    })
    this.stars.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.mat.dispose()
    this.stars.geometry.dispose()
    this.stars.dispose()
  }
}

function makeGeometry({ thickness, length }: SpaceConfig) {
  let geo = new THREE.CylinderGeometry(thickness, thickness, length, 10, 1)
  geo.rotateX(Math.PI / 2)
  return geo
}

function randomXY() {
  return randomRanged(MIN_XY, MAX_XY)
}
