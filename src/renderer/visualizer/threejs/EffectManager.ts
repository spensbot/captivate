import { EffectsConfig } from './effects/effectConfigs'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import * as THREE from 'three'
import { Effect, constructEffect } from './effects/Effect'
import UpdateResource from './UpdateResource'

export default class EffectManager {
  effects: Effect[] = []
  config: EffectsConfig
  effectComposer: EffectComposer

  constructor(config: EffectsConfig, renderer: THREE.WebGLRenderer) {
    this.config = config
    this.effectComposer = new EffectComposer(renderer)
  }

  updateConfig(config: EffectsConfig): void {
    this.config = config
  }

  update(dt: number, res: UpdateResource) {
    this.effects.forEach((effect) => effect.update(dt, res))
  }

  resize(width: number, height: number) {
    this.resetEffects()
    this.effectComposer.setSize(width, height)
    this.effects.forEach((effect) => effect.resize(width, height))
  }

  render() {
    this.effectComposer.render()
  }

  dispose() {
    this.effects.forEach((effect) => effect.dispose())
  }

  resetEffects() {
    this.removeAllEffects()
    this.effects = this.config.map((ec) => constructEffect(ec))
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
