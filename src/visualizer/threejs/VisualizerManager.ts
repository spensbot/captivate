import * as THREE from 'three'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import { CleanReduxState } from '../../renderer/redux/store'
import equal from 'deep-equal'
import UpdateResource from './UpdateResource'
import { EffectsConfig, initEffectsConfig } from './effects/effectConfigs'
import EffectManager from './EffectManager'
import { initLayerConfig, LayerConfig } from './layers/LayerConfig'

export interface VisualizerResource {
  rt: RealtimeState
  state: CleanReduxState
}

export default class VisualizerManager {
  private renderer: THREE.WebGLRenderer // The renderer is the only THREE class that actually takes a while to instantiate (>3ms)
  private width = 0
  private height = 0
  private layerConfig: LayerConfig
  private effectsConfig: EffectsConfig
  private updateResource: UpdateResource | null = null
  private effectManager: EffectManager

  constructor() {
    this.renderer = new THREE.WebGLRenderer()
    // this.renderer.autoClear = false
    // this.renderer.setClearColor(0x000000, 1)
    // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // this.renderer.outputEncoding = THREE.sRGBEncoding
    this.effectsConfig = initEffectsConfig()
    this.layerConfig = initLayerConfig('Cubes')
    this.effectManager = new EffectManager(
      this.layerConfig,
      this.effectsConfig,
      this.renderer,
      this.width,
      this.height
    )
  }

  getElement() {
    return this.renderer.domElement
  }

  update(dt: number, res: VisualizerResource) {
    const control = res.state.control
    const visualScene = control.visual.byId[control.visual.active]
    const effectsConfig = visualScene?.effectsConfig || []
    const layerConfig = visualScene.config
    const stuff = {
      params: res.rt.outputParams,
      time: res.rt.time,
      scene: control.light.byId[control.light.active],
      master: control.master,
    }
    if (this.updateResource === null) {
      this.updateResource = new UpdateResource(stuff)
    } else {
      this.updateResource.update(stuff)
    }
    if (
      !equal(effectsConfig, this.effectsConfig) ||
      !equal(layerConfig, this.layerConfig)
    ) {
      this.effectManager.dispose()
      this.effectManager = new EffectManager(
        layerConfig,
        effectsConfig,
        this.renderer,
        this.width,
        this.height
      )
      this.layerConfig = layerConfig
      this.effectsConfig = effectsConfig
      this.effectManager.resize(this.width, this.height)
    }

    this.effectManager.update(dt, this.updateResource)
    this.effectManager.render()
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height)
    this.effectManager.resize(width, height)
  }

  private printMemory() {
    const info = this.renderer.info
    console.log(`WebGLRenderer Info
    Geometries: ${info.memory.geometries}
    Textures: ${info.memory.textures}
    Programs: ${info.programs?.length}
    `)
  }
}
