import { Params, initBaseParams } from './params'
import {
  Modulator,
  initModulator,
  type ModManualAnchor,
  type SplitModShaping,
} from './modulation'
import { RandomizerOptions, initRandomizerOptions } from './randomizer'
import { nanoid } from 'nanoid'
import {
  LayerConfig,
  initLayerConfig,
} from '../visualizer/threejs/layers/LayerConfig'

export interface SceneBase {
  name: string
  epicness: number
  autoEnabled: boolean
}

export interface SplitScene_t {
  baseParams: Params
  /**
   * Per-parameter manual cursor anchor for combining modulation with the base
   * set-point (see `ModManualAnchor` in modulation.ts).
   */
  modManualAnchors?: Partial<Record<string, ModManualAnchor>>
  /**
   * Optional invert / phase offset / stair-step applied to LFO drivers on this split only.
   */
  splitModShaping?: SplitModShaping
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
  transition: VisualSceneTransitionConfig
}

export type VisualSceneTransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'flash'

export interface VisualSceneTransitionConfig {
  type: VisualSceneTransitionType
  durationMs: number
}

export function initVisualSceneTransitionConfig(): VisualSceneTransitionConfig {
  return {
    type: 'fade',
    durationMs: 420,
  }
}

export function initVisualScene(): VisualScene_t {
  return {
    name: 'Name',
    epicness: 0,
    autoEnabled: true,
    config: initLayerConfig('builtin'),
    transition: initVisualSceneTransitionConfig(),
  }
}

export function initVisualScenesState(): VisualScenes_t {
  const scenes = [
    { name: 'Pulse Grid', epicness: 0.15, preset: 'Pulse Grid' },
    { name: 'Neon Peaks', epicness: 0.45, preset: 'Neon Peaks' },
    { name: 'Orbit Wells', epicness: 0.7, preset: 'Orbit Wells' },
    { name: 'Energy Stack', epicness: 0.95, preset: 'Energy Stack' },
  ]

  const ids: string[] = []
  const byId: { [key: string]: VisualScene_t } = {}

  for (const scene of scenes) {
    const id = nanoid()
    const config = initLayerConfig('builtin')
    config.builtin.preset = scene.preset
    ids.push(id)
    byId[id] = {
      name: scene.name,
      epicness: scene.epicness,
      autoEnabled: true,
      config,
      transition: initVisualSceneTransitionConfig(),
    }
  }

  return {
    ids,
    byId,
    active: ids[0],
    auto: {
      enabled: false,
      epicness: 0,
      period: 1,
      energyMatchEnabled: false,
      matchAudioEnergy: false,
    },
  }
}

export interface AutoScene_t {
  enabled: boolean
  /** Manual energy target when energy matching uses the slider (not live audio). */
  epicness: number
  period: number
  /** When true, auto picks by closest scene energy on each period instead of random. */
  energyMatchEnabled: boolean
  /** When energy matching is on and audio input is active: use live audio energy. */
  matchAudioEnergy: boolean
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
      energyMatchEnabled: false,
      matchAudioEnergy: false,
    },
  }
}
