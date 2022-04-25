import { Params, initBaseParams } from './params'
import { Modulator, initModulator } from './modulation'
import { RandomizerOptions, initRandomizerOptions } from './randomizer'
import { nanoid } from 'nanoid'
import {
  VisualizerConfig,
  initVisualizerConfig,
} from '../renderer/visualizer/threejs/VisualizerConfig'
import {
  EffectsConfig,
  initEffectsConfig,
} from '../renderer/visualizer/threejs/EffectTypes'

export const DEFAULT_GROUP = 'Default'

interface Scene_base {
  name: string
  bombacity: number
  autoEnabled: boolean
}

export interface SplitScene_t {
  baseParams: Partial<Params>
  randomizer: RandomizerOptions
  groups: string[]
}
export function initSplitScene(): SplitScene_t {
  return {
    baseParams: initBaseParams(),
    randomizer: initRandomizerOptions(),
    groups: [],
  }
}
export interface LightScene_t extends Scene_base {
  modulators: Modulator[]
  baseParams: Partial<Params>
  randomizer: RandomizerOptions
  groups: null | string[]
  splitScenes: SplitScene_t[]
}

export function initLightScene(): LightScene_t {
  return {
    name: 'Name',
    bombacity: 0,
    autoEnabled: true,
    modulators: [initModulator(0)],
    baseParams: initBaseParams(),
    randomizer: initRandomizerOptions(),
    groups: null,
    splitScenes: [],
  }
}

export interface VisualScene_t extends Scene_base {
  config: VisualizerConfig
  effectsConfig: EffectsConfig
  activeEffectIndex: number
}

export function initVisualScene(): VisualScene_t {
  return {
    name: 'Name',
    bombacity: 0,
    autoEnabled: true,
    config: initVisualizerConfig('TextParticles'),
    effectsConfig: initEffectsConfig(),
    activeEffectIndex: 0,
  }
}

export interface AutoScene_t {
  enabled: boolean
  bombacity: number
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
      bombacity: 0,
      period: 1,
    },
  }
}
