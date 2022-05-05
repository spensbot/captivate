import { EffectsConfig } from './effects/effectConfigs'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import * as THREE from 'three'
import { Effect, constructEffect } from './effects/Effect'
import UpdateResource from './UpdateResource'
import { LayerConfig } from './layers/LayerConfig'
import { constructRenderLayer } from './effects/RenderLayer'

export default class EffectManager {
  effects: Effect[] = []
  layerConfig: LayerConfig
  effectsConfig: EffectsConfig
  effectComposer: EffectComposer

  constructor(
    layerConfig: LayerConfig,
    effectsConfig: EffectsConfig,
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ) {
    console.log('new EffectManager()')
    this.layerConfig = layerConfig
    this.effectsConfig = effectsConfig
    this.effectComposer = new EffectComposer(renderer)
    this.resetEffects(width, height)
  }

  updateConfig(layerConfig: LayerConfig, effectsConfig: EffectsConfig): void {
    this.layerConfig = layerConfig
    this.effectsConfig = effectsConfig
  }

  update(dt: number, res: UpdateResource) {
    this.effects.forEach((effect) => effect.update(dt, res))
  }

  resize(width: number, height: number) {
    console.log('resize()')
    this.effectComposer.setSize(width, height)
    this.resetEffects(width, height)
  }

  render() {
    this.effectComposer.render()
  }

  dispose() {
    this.effects.forEach((effect) => effect.dispose())
  }

  resetEffects(width: number, height: number) {
    this.removeAllEffects()
    this.effects = [
      constructRenderLayer(this.layerConfig),
      ...this.effectsConfig.map((effectConfig) =>
        constructEffect(effectConfig)
      ),
    ]
    this.effects.forEach((effect) => effect.resize(width, height))
    this.effects.forEach((effect) => this.effectComposer.addPass(effect.pass))
  }

  removeAllEffects() {
    // this.effectComposer.passes.forEach((pass) =>
    //   this.effectComposer.removePass(pass)
    // )
    this.effects.forEach((effect) => {
      this.effectComposer.removePass(effect.pass)
      effect.dispose()
    })
    this.effects = []
  }
}
