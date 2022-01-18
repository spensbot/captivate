import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initScene, Scene_t } from '../../engine/scene_t'
import { LfoShape } from '../../engine/oscillator'
import { Param, Params } from '../../engine/params'
import { clampNormalized, clamp } from '../../util/util'
import { initModulator } from '../../engine/modulation'
import { nanoid } from 'nanoid'
import { RandomizerOptions } from '../../engine/randomizer'
import cloneDeep from 'lodash.clonedeep'

export interface AutoScene_t {
  enabled: boolean
  bombacity: number
  period: number
}

export interface SceneState {
  ids: string[]
  byId: { [key: string]: Scene_t }
  active: string
  auto: AutoScene_t
  master: number
}

// export const sceneStateSchema = object<SceneState>({
//   ids: array(string()),
//   byId: map(sceneSchema),
//   active: string(),
//   auto: autoSceneSchema,
// })

const initID = nanoid()

export function initSceneState(): SceneState {
  return {
    ids: [initID],
    byId: {
      [initID]: initScene(),
    },
    active: initID,
    auto: {
      enabled: false,
      bombacity: 0,
      period: 1,
    },
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

function modifyActiveScene(
  state: SceneState,
  callback: (scene: Scene_t) => void
) {
  if (state.active && state.byId[state.active]) {
    callback(state.byId[state.active])
  }
}

export const scenesSlice = createSlice({
  name: 'scenes',
  initialState: initSceneState(),
  reducers: {
    setAutoSceneEnabled: (state, { payload }: PayloadAction<boolean>) => {
      state.auto.enabled = payload
    },
    setAutoSceneBombacity: (state, { payload }: PayloadAction<number>) => {
      state.auto.bombacity = payload
    },
    setAutoScenePeriod: (state, { payload }: PayloadAction<number>) => {
      state.auto.period = payload
    },
    resetScenesState: (state, { payload }: PayloadAction<SceneState>) => {
      state.active = payload.active
      state.byId = payload.byId
      state.ids = payload.ids
    },
    addScene: (
      state,
      { payload }: PayloadAction<{ id: string; scene: Scene_t }>
    ) => {
      state.ids.push(payload.id)
      state.byId[payload.id] = payload.scene
    },
    removeScene: (state, { payload }: PayloadAction<{ index: number }>) => {
      const id = state.ids[payload.index]
      state.ids.splice(payload.index, 1)
      delete state.byId[id]
      state.active = state.ids[0]
    },
    setActiveScene: (state, { payload }: PayloadAction<string>) => {
      state.active = payload
    },
    setActiveSceneIndex: (state, { payload }: PayloadAction<number>) => {
      if (payload > -1 && state.ids.length > payload) {
        state.active = state.ids[payload]
      }
    },
    setActiveSceneBombacity: (state, { payload }: PayloadAction<number>) => {
      modifyActiveScene(state, (scene) => {
        scene.bombacity = payload
      })
    },
    setActiveSceneName: (state, { payload }: PayloadAction<string>) => {
      modifyActiveScene(state, (scene) => {
        scene.name = payload
      })
    },
    setModulatorShape: (
      state,
      { payload }: PayloadAction<{ index: number; shape: LfoShape }>
    ) => {
      modifyActiveScene(state, (scene) => {
        scene.modulators[payload.index].lfo.shape = payload.shape
      })
    },
    setPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; newVal: number }>
    ) => {
      modifyActiveScene(state, (scene) => {
        scene.modulators[payload.index].lfo.period = payload.newVal
      })
    },
    incrementPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; amount: number }>
    ) => {
      modifyActiveScene(state, (scene) => {
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
      modifyActiveScene(state, (scene) => {
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
      modifyActiveScene(state, (scene) => {
        scene.modulators.push(initModulator())
      })
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveScene(state, (scene) => {
        scene.modulators.splice(payload, 1)
      })
    },
    resetModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveScene(state, (scene) => {
        scene.modulators[payload] = initModulator()
      })
    },
    setModulation: (
      state,
      { payload }: PayloadAction<SetModulationPayload>
    ) => {
      const { index, param, value } = payload
      modifyActiveScene(state, (scene) => {
        scene.modulators[index].modulation[param] = value
      })
    },
    setBaseParams: (state, action: PayloadAction<Partial<Params>>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveScene(state, (scene) => {
          scene.baseParams[key as Param] = value
        })
      }
    },
    incrementBaseParams: (state, action: PayloadAction<Partial<Params>>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveScene(state, (scene) => {
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
      modifyActiveScene(state, (scene) => {
        scene.randomizer[payload.key] = payload.value
      })
    },
    setMaster: (state, { payload }: PayloadAction<number>) => {
      state.master = payload
    },
    reorderScene: (
      state,
      { payload }: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      let element = state.ids.splice(payload.fromIndex, 1)[0]
      state.ids.splice(payload.toIndex, 0, element)
    },
    copyActiveScene: (state, _: PayloadAction<undefined>) => {
      if (state.active) {
        const id = nanoid()
        state.ids.push(id)
        state.byId[id] = cloneDeep(state.byId[state.active])
      }
    },
  },
})

export const {
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  resetScenesState,
  addScene,
  removeScene,
  setActiveScene,
  setActiveSceneIndex,
  setActiveSceneBombacity,
  setActiveSceneName,
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
  setMaster,
  reorderScene,
  copyActiveScene,
} = scenesSlice.actions

export default scenesSlice.reducer
