import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulation'
import { RandomizerOptions, initRandomizerOptions } from './randomizer'
import { nanoid } from 'nanoid'
import {
  VisualizerConfig,
  initVisualizerConfig,
} from '../renderer/visualizer/threejs/VisualizerConfig'

export interface LightScene_t {
  name: string
  bombacity: number
  modulators: Modulator[]
  baseParams: Params
  randomizer: RandomizerOptions
  groups: string[]
}

export function initLightScene(): LightScene_t {
  return {
    name: 'Name',
    bombacity: 0,
    modulators: [initModulator()],
    baseParams: initParams(),
    randomizer: initRandomizerOptions(),
    groups: [],
  }
}

export function handleBadLightScene(
  scene: LightScene_t | undefined
): LightScene_t {
  return scene || initLightScene()
}

export interface VisualScene_t {
  name: string
  bombacity: number
  config: VisualizerConfig
}

export function initVisualScene(): VisualScene_t {
  return {
    name: 'Name',
    bombacity: 0,
    config: initVisualizerConfig('TextParticles'),
  }
}

export function handleBadVisualScene(
  scene: VisualScene_t | undefined
): VisualScene_t {
  return scene || initVisualScene()
}

export function handleBadScene(
  scene: VisualScene_t | LightScene_t | undefined
): VisualScene_t | LightScene_t {
  return scene || initVisualScene()
}

export interface AutoScene_t {
  enabled: boolean
  bombacity: number
  period: number
}

type SceneID = string

interface ScenesState<T> {
  ids: SceneID[]
  byId: { [key: SceneID]: T | undefined }
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
