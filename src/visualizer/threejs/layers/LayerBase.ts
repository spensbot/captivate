import * as THREE from 'three'
import { visibleSizeAtZ } from '../util/util'
import UpdateResource from '../UpdateResource'

export default abstract class LayerBase {
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
