import * as THREE from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'

export interface CubeConfig {
  type: 'Cube'
}
export default class Cube extends LayerBase {
  private cube: THREE.Mesh
  private material = new THREE.MeshNormalMaterial()

  constructor() {
    super()
    let geometry = new THREE.BoxGeometry(2, 2, 2)
    this.cube = new THREE.Mesh(geometry, this.material)
    this.scene.add(this.cube)
  }

  update({ time }: UpdateResource): void {
    this.cube.rotation.x = time.beats
    this.cube.rotation.y = time.beats
  }

  dispose() {
    this.cube.geometry.dispose()
    this.material.dispose()
  }
}
