import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import Spheres from './Spheres'
import TextSpin from './TextSpin'
import Cubes from './Cubes'
import CubeSphere from './CubeSphere'
import TextParticles from './TextParticles'

type Visualizer = Spheres | TextSpin | Cubes | CubeSphere | TextParticles
type VisualizerType = Visualizer['type']

export default class VisualizerManager {
  private renderer: THREE.WebGLRenderer // The renderer is the only THREE class that actually takes a while to instantiate (>3ms)
  private active: VisualizerBase

  constructor() {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.active = new TextParticles({
      text: [
        'CAPTIVATE',
        'YOUR',
        'AUDIENCE',
        'BE\nHERE\nNOW',
        'FEEL',
        'WITH',
        'ME',
        'FEEL\nWITH\nME',
        "IT's\nOK",
      ], //['FEEL', 'WITH', 'ME', 'FEEL\nWITH\nME'],
      fontType: 'zsd',
      textSize: 1.5,
      particleColor: 0xffffff,
      particleSize: 0.1,
      particleCount: 10000,
      physics: {
        type: 'gravity',
        gravity: 15,
        drag: 3,
      },
      throwVelocity: 0.5,
    })
  }

  getElement() {
    return this.renderer.domElement
  }

  update(rt: RealtimeState, state: ReduxState) {
    const control = state.control.present
    this.active.update({
      params: rt.outputParams,
      time: rt.time,
      scene: control.light.byId[control.light.active],
      master: control.master,
    })
    this.renderer.render(...this.active.getRenderInputs())
  }

  resize(width: number, height: number) {
    this.active.resize(width, height)
    this.renderer.setSize(width, height)
  }
}
