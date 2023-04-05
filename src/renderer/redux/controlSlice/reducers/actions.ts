import { ReorderParams } from '../../../../features/utils/util'

import { nanoid } from 'nanoid'
import { RandomizerOptions } from '../../../../features/bpm/shared/randomizer'
import cloneDeep from 'lodash.clonedeep'
import { LayerConfig } from '../../../../features/visualizer/threejs/layers/LayerConfig'
import { EffectConfig } from '../../../../features/visualizer/threejs/effects/effectConfigs'

import { reorderArray } from '../../../../features/utils/util'
import { PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit'
import {
  LightScene_t,
  LightScenes_t,
  VisualScene_t,
  VisualScenes_t,
  SceneType,
  initSplitScene,
  ScenesStateBundle,
  initLightScene,
  initVisualScene,
} from '../../../../features/scenes/shared/Scenes'

import { paramsActionReducer } from 'features/params/redux/reducer'
import { modulationActionReducer } from 'features/modulation/redux/reducer'

export interface ActionState extends ScenesStateBundle {
  master: number
}

export function modifyActiveLightScene(
  state: ActionState,
  callback: (scene: LightScene_t) => void
) {
  const scene = state.light.byId[state.light.active]
  if (scene) {
    callback(scene)
  }
}

function modifyActiveVisualScene(
  state: ActionState,
  callback: (scene: VisualScene_t) => void
) {
  const scene = state.visual.byId[state.visual.active]
  if (scene) {
    callback(scene)
  }
}

function modifyActiveScene(
  state: ActionState,
  sceneType: SceneType,
  callback: (scene: VisualScene_t | LightScene_t) => void
) {
  const scene = state[sceneType].byId[state[sceneType].active]
  if (scene) {
    callback(scene)
  }
}

type ScopedAction<T> = PayloadAction<{
  sceneType: SceneType
  val: T
}>

export const createTypedReducers = <
  Reducers extends SliceCaseReducers<ActionState> = SliceCaseReducers<ActionState>
>(
  reducers: Reducers
) => {
  return reducers
}

export const actions = {
  ...createTypedReducers({
    setMaster: (state, { payload }: PayloadAction<number>) => {
      state.master = payload
    },
    // =====================   LIGHT & VISUAL SCENES   ===========================
    setAutoSceneEnabled: (
      state,
      { payload: { sceneType, val } }: ScopedAction<boolean>
    ) => {
      state[sceneType].auto.enabled = val
    },
    setAutoSceneBombacity: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      state[sceneType].auto.epicness = val
    },
    setAutoScenePeriod: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      state[sceneType].auto.period = val
    },
    newScene: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      const id = nanoid()
      scenes.ids.push(id)
      scenes.byId[id] =
        payload === 'light' ? initLightScene() : initVisualScene()
      scenes.active = id
    },
    removeScene: (
      state,
      { payload: { sceneType, val } }: ScopedAction<{ index: number }>
    ) => {
      const scenes = state[sceneType]
      const id = scenes.ids[val.index]
      scenes.ids.splice(val.index, 1)
      delete scenes.byId[id]
      // This is necessary in a world where you can delete the active scene... Which you currently can't
      // if (state.active === id) {
      //   state.active = state.ids[0]
      // }
    },
    setActiveScene: (
      state,
      { payload: { sceneType, val } }: ScopedAction<string>
    ) => {
      state[sceneType].active = val
    },
    setActiveSceneIndex: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      const scenes = state[sceneType]
      if (val > -1 && scenes.ids.length > val) {
        scenes.active = scenes.ids[val]
      } else {
        console.error('Tried to set the scene to an out-of-bounds index')
      }
    },
    setActiveSceneBombacity: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      modifyActiveScene(state, sceneType, (scene) => {
        scene.epicness = val
      })
    },
    setActiveSceneAutoEnabled: (
      state,
      { payload: { sceneType, val } }: ScopedAction<boolean>
    ) => {
      modifyActiveScene(state, sceneType, (scene) => {
        scene.autoEnabled = val
      })
    },
    setActiveSceneName: (
      state,
      { payload: { sceneType, val } }: ScopedAction<string>
    ) => {
      modifyActiveScene(state, sceneType, (scene) => {
        scene.name = val
      })
    },
    reorderScene: (
      state,
      { payload: { sceneType, val } }: ScopedAction<ReorderParams>
    ) => {
      reorderArray(state[sceneType].ids, val)
    },
    copyActiveScene: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      const id = nanoid()
      scenes.ids.push(id)
      scenes.byId[id] = cloneDeep(scenes.byId[scenes.active])
    },
    sortScenesByBombacity: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      scenes.ids.sort((idLeft, idRight) => {
        const leftScene = scenes.byId[idLeft]
        const rightScene = scenes.byId[idRight]
        if (leftScene && rightScene)
          return leftScene.epicness - rightScene.epicness
        return 0
      })
    },
    autoBombacity: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      scenes.ids.forEach((id, i) => {
        const scene = scenes.byId[id]
        if (scene) scene.epicness = i / (scenes.ids.length - 1)
      })
    },

    // =====================   LIGHT SCENES ONLY   ===========================
    resetLightScenes: (state, { payload }: PayloadAction<LightScenes_t>) => {
      state.light = payload
    },
    ...paramsActionReducer,
    ...modulationActionReducer,

    setRandomizer: (
      state,
      {
        payload: { key, value, splitIndex },
      }: PayloadAction<{
        key: keyof RandomizerOptions
        value: number
        splitIndex: number
      }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.splitScenes[splitIndex].randomizer[key] = value
      })
    },
    addSplitScene: (state, {}: PayloadAction<undefined>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.splitScenes.push(initSplitScene())
        scene.modulators.forEach((modulator) => {
          modulator.splitModulations.push({})
        })
      })
    },
    removeSplitSceneByIndex: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.splitScenes.splice(payload, 1)
        scene.modulators.forEach((modulator) => {
          modulator.splitModulations.splice(payload, 1)
        })
      })
    },
    setSceneGroup: (
      state,
      {
        payload: { index, group, val },
      }: PayloadAction<{
        index: number
        group: string
        val: boolean | undefined
      }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        if (val === undefined) {
          delete scene.splitScenes[index].groups[group]
        } else {
          scene.splitScenes[index].groups[group] = val
        }
      })
    },
    // =====================   VISUAL SCENES ONLY   ===========================
    resetVisualScenes: (state, { payload }: PayloadAction<VisualScenes_t>) => {
      state.visual = payload
    },
    setVisualSceneConfig: (state, { payload }: PayloadAction<LayerConfig>) => {
      modifyActiveVisualScene(state, (scene) => (scene.config = payload))
    },
    activeVisualSceneEffect_add: (
      state,
      { payload }: PayloadAction<EffectConfig>
    ) => {
      modifyActiveVisualScene(state, (scene) => {
        scene.effectsConfig.push(payload)
        scene.activeEffectIndex = scene.effectsConfig.length - 1
      })
    },
    activeVisualSceneEffect_set: (
      state,
      { payload }: PayloadAction<EffectConfig>
    ) => {
      modifyActiveVisualScene(state, (scene) => {
        scene.effectsConfig[scene.activeEffectIndex] = payload
      })
    },
    activeVisualSceneEffect_removeIndex: (
      state,
      { payload }: PayloadAction<number>
    ) => {
      modifyActiveVisualScene(state, (scene) => {
        scene.effectsConfig.splice(payload, 1)
        if (scene.activeEffectIndex >= scene.effectsConfig.length) {
          scene.activeEffectIndex = scene.effectsConfig.length - 1
        }
      })
    },
    activeVisualSceneEffect_reorder: (
      state,
      { payload }: PayloadAction<ReorderParams>
    ) => {
      modifyActiveVisualScene(state, (scene) => {
        reorderArray(scene.effectsConfig, payload)
      })
    },
    activeVisualScene_setActiveEffectIndex: (
      state,
      { payload }: PayloadAction<number>
    ) => {
      modifyActiveVisualScene(
        state,
        (scene) => (scene.activeEffectIndex = payload)
      )
    },
  }),
}
