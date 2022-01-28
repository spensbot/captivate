import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { CleanReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import { VisualizerConfig, constructVisualizer } from './VisualizerConfig'
import equal from 'deep-equal'

export interface VisualizerResource {
  rt: RealtimeState
  state: CleanReduxState
}

export default class VisualizerManager {
  private renderer: THREE.WebGLRenderer // The renderer is the only THREE class that actually takes a while to instantiate (>3ms)
  private active: VisualizerBase
  private config: VisualizerConfig

  constructor(res: VisualizerResource) {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputEncoding = THREE.sRGBEncoding
    const visual = res.state.control.visual
    this.config = visual.byId[visual.active].config
    this.active = constructVisualizer(this.config)
  }

  getElement() {
    return this.renderer.domElement
  }

  update(dt: number, res: VisualizerResource) {
    const control = res.state.control
    const config = control.visual.byId[control.visual.active].config
    if (!equal(config, this.config)) {
      this.config = config
      this.active = constructVisualizer(this.config)
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
    this.active.resize(width, height)
    this.renderer.setSize(width, height)
    this.renderer.info.reset()
    this.renderer.clear(true, true, true)
  }
}
