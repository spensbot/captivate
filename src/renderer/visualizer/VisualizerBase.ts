import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'

// This abstract class is an interface and should never contain members (except for type) or a constructor
export default abstract class VisualizerBase {
  abstract readonly type: string
  protected scene: THREE.Scene
  protected camera: THREE.PerspectiveCamera

  abstract update(rt: RealtimeState, state: ReduxState): void

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
}
