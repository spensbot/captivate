import * as THREE from 'three'
import { LightScene_t } from '../../engine/LightScene'
import { visibleSizeAtZ } from './animations'
import { Params } from '../../engine/params'
import { TimeState } from '../../engine/TimeState'

export interface UpdateResource {
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
}

// This abstract class is an interface and should never contain members (except for type) or a constructor
export default abstract class VisualizerBase {
  protected scene: THREE.Scene
  protected camera: THREE.PerspectiveCamera

  abstract update(dt: number, res: UpdateResource): void

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera()
  }

  resize(width: number, height: number): void {
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.001, 1000)
    this.camera.position.z = 5
    this.camera.updateProjectionMatrix()
  }

  getRenderInputs(): [THREE.Scene, THREE.Camera] {
    return [this.scene, this.camera]
  }

  visibleSizeAtZ(z: number) {
    return visibleSizeAtZ(z, this.camera)
  }
}
