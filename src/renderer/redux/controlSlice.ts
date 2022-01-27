import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initLightScene, LightScene_t } from '../../engine/LightScene'
import { LfoShape } from '../../engine/oscillator'
import { Param, Params } from '../../engine/params'
import { clampNormalized, clamp } from '../../util/util'
import { initModulator } from '../../engine/modulation'
import { nanoid } from 'nanoid'
import { RandomizerOptions } from '../../engine/randomizer'
import cloneDeep from 'lodash.clonedeep'

export interface VisualScene_t {
  name: string
  bombacity: number
}

export function initVisualScene(): VisualScene_t {
  return {
    name: 'Name',
    bombacity: 0,
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

interface ScenesStateBundle {
  light: LightScenes_t
  visual: VisualScenes_t
}

export type SceneType = keyof ScenesStateBundle

export interface ControlState extends ScenesStateBundle {
  master: number
}

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

export function initControlState(): ControlState {
  return {
    light: initScenesState(initLightScene()),
    visual: initScenesState(initVisualScene()),
    master: 1,
  }
}

interface IncrementModulatorPayload {
  index: number
  flip: number
  phaseShift: number
  skew: number
  symmetricSkew: number
}

interface SetModulationPayload {
  index: number
  param: Param
  value: number
}

function modifyActiveLightScene(
  state: ControlState,
  callback: (scene: LightScene_t) => void
) {
  const scene = state.light.byId[state.light.active]
  if (scene) {
    callback(scene)
  }
}

function modifyActiveVisualScene(
  state: ControlState,
  callback: (scene: VisualScene_t) => void
) {
  const scene = state.visual.byId[state.visual.active]
  if (scene) {
    callback(scene)
  }
}

function modifyActiveScene(
  state: ControlState,
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

export const scenesSlice = createSlice({
  name: 'scenes',
  initialState: initControlState(),
  reducers: {
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
      state[sceneType].auto.bombacity = val
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
      }
    },
    setActiveSceneBombacity: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      modifyActiveScene(state, sceneType, (scene) => {
        scene.bombacity = val
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
      {
        payload: {
          sceneType,
          val: { fromIndex, toIndex },
        },
      }: ScopedAction<{ fromIndex: number; toIndex: number }>
    ) => {
      let element = state[sceneType].ids.splice(fromIndex, 1)[0]
      state[sceneType].ids.splice(toIndex, 0, element)
    },
    copyActiveScene: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      const id = nanoid()
      scenes.ids.push(id)
      scenes.byId[id] = cloneDeep(scenes.byId[scenes.active])
    },

    // =====================   LIGHT SCENES ONLY   ===========================
    resetLightScenes: (state, { payload }: PayloadAction<LightScenes_t>) => {
      state.light = payload
    },
    setModulatorShape: (
      state,
      { payload }: PayloadAction<{ index: number; shape: LfoShape }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload.index].lfo.shape = payload.shape
      })
    },
    setPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; newVal: number }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload.index].lfo.period = payload.newVal
      })
    },
    incrementPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; amount: number }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload.index].lfo.period = clamp(
          scene.modulators[payload.index].lfo.period + payload.amount,
          0.25,
          16
        )
      })
    },
    incrementModulator: (
      state,
      { payload }: PayloadAction<IncrementModulatorPayload>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const modulator = scene.modulators[payload.index]
        modulator.lfo.flip = clampNormalized(modulator.lfo.flip + payload.flip)
        modulator.lfo.phaseShift = clampNormalized(
          modulator.lfo.phaseShift + payload.phaseShift
        )
        modulator.lfo.skew = clampNormalized(modulator.lfo.skew + payload.skew)
        modulator.lfo.symmetricSkew = clampNormalized(
          modulator.lfo.symmetricSkew + payload.symmetricSkew
        )
      })
    },
    addModulator: (state, _: PayloadAction<void>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators.push(initModulator())
      })
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators.splice(payload, 1)
      })
    },
    resetModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload] = initModulator()
      })
    },
    setModulation: (
      state,
      { payload }: PayloadAction<SetModulationPayload>
    ) => {
      const { index, param, value } = payload
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[index].modulation[param] = value
      })
    },
    setBaseParams: (state, action: PayloadAction<Partial<Params>>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveLightScene(state, (scene) => {
          scene.baseParams[key as Param] = value
        })
      }
    },
    incrementBaseParams: (state, action: PayloadAction<Partial<Params>>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveLightScene(state, (scene) => {
          scene.baseParams[key as Param] = clampNormalized(
            scene.baseParams[key as Param] + value
          )
        })
      }
    },
    setRandomizer: (
      state,
      {
        payload,
      }: PayloadAction<{ key: keyof RandomizerOptions; value: number }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.randomizer[payload.key] = payload.value
      })
    },

    // =====================   VISUAL SCENES ONLY   ===========================
    resetVisualScenes: (state, { payload }: PayloadAction<VisualScenes_t>) => {
      state.visual = payload
    },
  },
})

export const {
  setMaster,

  // LIGHT & VISUAL SCENES
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  newScene,
  removeScene,
  setActiveScene,
  setActiveSceneIndex,
  setActiveSceneBombacity,
  setActiveSceneName,
  reorderScene,
  copyActiveScene,

  // LIGHT SCENES
  resetLightScenes,
  setBaseParams,
  incrementBaseParams,
  setModulatorShape,
  setPeriod,
  incrementPeriod,
  incrementModulator,
  addModulator,
  removeModulator,
  setModulation,
  resetModulator,
  setRandomizer,

  // VISUAL SCENES
  resetVisualScenes,
} = scenesSlice.actions

export default scenesSlice.reducer
