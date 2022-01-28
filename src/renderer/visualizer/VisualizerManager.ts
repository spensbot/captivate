import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { CleanReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import { VisualizerConfig, initVisualizerConfig } from './VisualizerConfig'
import equal from 'deep-equal'
import Spheres from './Spheres'
import TextSpin from './TextSpin'
import Cubes from './Cubes'
import CubeSphere from './CubeSphere'
import TextParticles from './TextParticles'

export interface VisualizerResource {
  rt: RealtimeState
  state: CleanReduxState
}

export function constructVisualizer(config: VisualizerConfig): VisualizerBase {
  if (config.type === 'CubeSphere') return new CubeSphere()
  if (config.type === 'Cubes') return new Cubes()
  if (config.type === 'Spheres') return new Spheres()
  if (config.type === 'TextParticles') return new TextParticles(config)
  if (config.type === 'TextSpin') return new TextSpin()
  return new Spheres()
}

export default class VisualizerManager {
  private renderer: THREE.WebGLRenderer // The renderer is the only THREE class that actually takes a while to instantiate (>3ms)
  private active: VisualizerBase
  private config: VisualizerConfig
  private width = 0
  private height = 0

  constructor() {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.config = initVisualizerConfig('Spheres')
    this.active = constructVisualizer(this.config)
  }

  getElement() {
    return this.renderer.domElement
  }

  update(dt: number, res: VisualizerResource) {
    this.renderer.clear()
    const control = res.state.control
    const config = control.visual.byId[control.visual.active].config
    if (!equal(config, this.config)) {
      this.config = config
      this.active = constructVisualizer(this.config)
      this.active.resize(this.width, this.height)
    }

    this.active.update(dt, {
      params: res.rt.outputParams,
      time: res.rt.time,
      scene: control.light.byId[control.light.active],
      master: control.master,
    })
    this.renderer.render(...this.active.getRenderInputs())
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.clear()
    this.active.resize(width, height)
    this.renderer.setSize(width, height)
  }
}
