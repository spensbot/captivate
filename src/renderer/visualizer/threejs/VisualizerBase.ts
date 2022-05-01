import * as THREE from 'three'
import { LightScene_t } from '../../../shared/Scenes'
import { visibleSizeAtZ } from './util'
import { Params } from '../../../shared/params'
import { TimeState } from '../../../shared/TimeState'
import { isNewPeriod } from '../../../shared/TimeState'

export interface UpdateInfo {
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
}

export class UpdateResource {
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
  private lastBeats: number

  constructor(stuff: UpdateInfo) {
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
    this.lastBeats = this.time.beats
  }

  update(stuff: UpdateInfo) {
    this.lastBeats = this.time.beats
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
  }

  isNewPeriod(beatsPerPeriod: number) {
    return isNewPeriod(this.lastBeats, this.time.beats, beatsPerPeriod)
  }
}

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

  // Dispose of Geometries, Materials, Textures... Anything that has a dispose() method
  //https://threejs.org/docs/index.html#manual/en/introduction/How-to-dispose-of-objects
  abstract dispose(): void
}
