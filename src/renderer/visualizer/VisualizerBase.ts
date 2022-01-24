import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import { Scene_t } from '../../engine/scene_t'
import { visibleSizeAtZ } from './animations'
import { Params } from '../../engine/params'
import { TimeState } from '../../engine/TimeState'

export interface UpdateResource {
  time: TimeState
  params: Params
  scene: Scene_t
  master: number
}

// This abstract class is an interface and should never contain members (except for type) or a constructor
export default abstract class VisualizerBase {
  abstract readonly type: string
  protected scene: THREE.Scene
  protected camera: THREE.PerspectiveCamera

  abstract update(res: UpdateResource): void

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera()
  }

  resize(width: number, height: number): void {
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.001, 1000)
    this.camera.position.z = 5
  }

  getRenderInputs(): [THREE.Scene, THREE.Camera] {
    return [this.scene, this.camera]
  }

  visibleSizeAtZ(z: number) {
    return visibleSizeAtZ(z, this.camera)
  }
}
