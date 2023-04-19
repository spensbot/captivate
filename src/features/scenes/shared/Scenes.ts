import { Params, initBaseParams } from '../../params/shared/params'
import { Modulator, initModulator } from '../../modulation/shared/modulation'
import { RandomizerOptions, initRandomizerOptions } from '../../bpm/shared/randomizer'
import { nanoid } from 'nanoid'
import {
  LayerConfig,
  initLayerConfig,
} from '../../visualizer/threejs/layers/LayerConfig'
import {
  EffectsConfig,
  initEffectsConfig,
} from '../../visualizer/threejs/effects/effectConfigs'

export interface SceneBase {
  name: string
  epicness: number
  autoEnabled: boolean
}

export interface SplitScene_t {
  baseParams: Partial<Params>
  randomizer: RandomizerOptions
  // true = include group | false = include not group
  groups: { [key: string]: boolean | undefined }
}

export function initSplitScene(): SplitScene_t {
  return {
    baseParams: initBaseParams(),
    randomizer: initRandomizerOptions(),
    groups: {},
  }
}

export interface LightScene_t extends SceneBase {
  modulators: Modulator[]
  splitScenes: SplitScene_t[]
}

export function initLightScene(): LightScene_t {
  return {
    name: 'Name',
    epicness: 0,
    autoEnabled: true,
    modulators: [initModulator(1)],
    splitScenes: [initSplitScene()],
  }
}

export interface VisualScene_t extends SceneBase {
  config: LayerConfig
  effectsConfig: EffectsConfig
  activeEffectIndex: number
}

export function initVisualScene(): VisualScene_t {
  return {
    name: 'Name',
    epicness: 0,
    autoEnabled: true,
    config: initLayerConfig('TextParticles'),
    effectsConfig: initEffectsConfig(),
    activeEffectIndex: 0,
  }
}

export interface AutoScene_t {
  enabled: boolean
  epicness: number
  period: number
}

type SceneID = string

interface ScenesState<T> {
  ids: SceneID[]
  byId: { [key: SceneID]: T }
  active: SceneID
  auto: AutoScene_t
}

export type LightScenes_t = ScenesState<LightScene_t>
export type VisualScenes_t = ScenesState<VisualScene_t>

export interface ScenesStateBundle {
  light: LightScenes_t
  visual: VisualScenes_t
}

export type SceneType = keyof ScenesStateBundle

export function initScenesState<T>(defaultScene: T): ScenesState<T> {
  const initID = nanoid()
  return {
    ids: [initID],
    byId: {
      [initID]: defaultScene,
    },
    active: initID,
    auto: {
      enabled: false,
      epicness: 0,
      period: 1,
    },
  }
}
