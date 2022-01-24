import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import Cube from './Cube'
import Spheres from './Spheres'
import TextRandom from './TextSpin'
import Cubes from './Cubes'
import CubeSphere from './CubeSphere'

export default class VisualizerManager {
  private renderer: THREE.WebGLRenderer // The renderer is the only THREE class that actually takes a while to instantiate (>3ms)
  private active: VisualizerBase

  constructor() {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.active = new Cubes()
  }

  getElement() {
    return this.renderer.domElement
  }

  update(rt: RealtimeState, state: ReduxState) {
    this.active.update(rt, state)
    this.renderer.render(...this.active.getRenderInputs())
  }

  resize(width: number, height: number) {
    this.active.resize(width, height)
    this.renderer.setSize(width, height)
  }
}
