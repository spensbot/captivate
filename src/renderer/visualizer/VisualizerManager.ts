import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'

export default class VisualizerManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private geometry: THREE.BoxGeometry
  private material: THREE.MeshBasicMaterial
  private cube: THREE.Mesh

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.renderer = new THREE.WebGLRenderer({ alpha: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.geometry = new THREE.BoxGeometry(2, 2, 2)
    this.material = new THREE.MeshBasicMaterial({})
    this.cube = new THREE.Mesh(this.geometry, this.material)
    this.camera.position.z = 5
    this.scene.add(this.cube)
  }

  getElement() {
    return this.renderer.domElement
  }

  update(_rtState: RealtimeState, _state: ReduxState) {
    this.cube.rotation.x = _rtState.time.beats
    this.cube.rotation.y = _rtState.time.beats
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.001, 1000)
    this.camera.position.z = 5
    this.renderer.setSize(width, height)
  }
}
