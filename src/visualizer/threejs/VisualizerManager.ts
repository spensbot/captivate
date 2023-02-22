import * as THREE from 'three'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import { CleanReduxState } from '../../renderer/redux/store'
import equal from 'deep-equal'
import UpdateResource from './UpdateResource'
import { EffectsConfig, initEffectsConfig } from './effects/effectConfigs'
import EffectManager from './EffectManager'
import { initLayerConfig, LayerConfig } from './layers/LayerConfig'

const MAX_DT = 100 // ms

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
  private stoppedScene = new THREE.Scene()
  private stoppedCamera = new THREE.Camera()

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
      dt: Math.min(dt, MAX_DT),
      params: res.rt.splitStates[0].outputParams,
      time: res.rt.time,
      scene: control.light.byId[control.light.active],
      master: control.master,
      size: {
        width: this.width,
        height: this.height,
      },
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
      // periodic memory wipe to clear any leaks
      this.ruthlessly_nuke_all_memory_I_dont_even_care_kill_it_with_fire()

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

    this.effectManager.update(this.updateResource)
    if (this.updateResource.time.isPlaying) {
      this.effectManager.render()
    } else {
      this.renderer.render(this.stoppedScene, this.stoppedCamera)
    }
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height)
    this.effectManager.resize(width, height)
  }

  // This is a bandaid fix for the horrendous memory leaking that happens in the visualizer...
  // It will take alot of time to fully debug the memory leaks...
  // I've spent so much time trying and I can't squash them all
  // So this is a temporary fix.
  ruthlessly_nuke_all_memory_I_dont_even_care_kill_it_with_fire() {
    // console.log(`WebGLRenderer Memory Wiped!!!`)
    this.renderer.dispose()
  }

  // private printMemory() {
  //   const info = this.renderer.info
  //   console.log(`WebGLRenderer Info
  //   Geometries: ${info.memory.geometries}
  //   Textures: ${info.memory.textures}
  //   Programs: ${info.programs?.length}
  //   `)
  // }
}
