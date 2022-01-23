import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'

export default class Cube extends VisualizerBase {
  readonly type = 'Cube'
  private cube: THREE.Mesh

  constructor() {
    super()
    let geometry = new THREE.BoxGeometry(2, 2, 2)
    let material = new THREE.MeshBasicMaterial()
    this.cube = new THREE.Mesh(geometry, material)
    this.scene.add(this.cube)
  }

  update(rt: RealtimeState, _state: ReduxState): void {
    this.cube.rotation.x = rt.time.beats
    this.cube.rotation.y = rt.time.beats
  }
}
