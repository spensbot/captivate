import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LfoShape } from '../../shared/oscillator'
import { Param, Params } from '../../shared/params'
import { clampNormalized, clamp, ReorderParams } from '../../shared/util'
import { initModulator } from '../../shared/modulation'
import { nanoid } from 'nanoid'
import { RandomizerOptions } from '../../shared/randomizer'
import cloneDeep from 'lodash.clonedeep'
import { VisualizerConfig } from '../visualizer/threejs/VisualizerConfig'
import { EffectConfig } from '../visualizer/threejs/EffectTypes'
import { DeviceState, initDeviceState, midiActions } from './deviceState'
import {
  ScenesStateBundle,
  initScenesState,
  initLightScene,
  initVisualScene,
  LightScene_t,
  LightScenes_t,
  VisualScene_t,
  VisualScenes_t,
  SceneType,
} from '../../shared/Scenes'
import { reorderArray } from '../../shared/util'

export interface ControlState extends ScenesStateBundle {
  device: DeviceState
  master: number
}
export function initControlState(): ControlState {
  return {
    light: initScenesState(initLightScene()),
    visual: initScenesState(initVisualScene()),
    device: initDeviceState(),
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
  value: number | undefined
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
      } else {
        console.error('Tried to set the scene to an out-of-bounds index')
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
    setActiveSceneAutoEnabled: (
      state,
      { payload: { sceneType, val } }: ScopedAction<boolean>
    ) => {
      console.log('val', val)
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
          return leftScene.bombacity - rightScene.bombacity
        return 0
      })
    },
    autoBombacity: (state, { payload }: PayloadAction<SceneType>) => {
      const scenes = state[payload]
      scenes.ids.forEach((id, i) => {
        const scene = scenes.byId[id]
        if (scene) scene.bombacity = i / (scenes.ids.length - 1)
      })
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
    setVisualSceneConfig: (
      state,
      { payload }: PayloadAction<VisualizerConfig>
    ) => {
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

    // =====================   MIDI   ===========================================
    midiListen: (state, action) => midiActions.listen(state.device, action),
    midiSetButtonAction: (state, action) =>
      midiActions.setButtonAction(state.device, action),
    midiSetIsEditing: (state, action) =>
      midiActions.setIsEditing(state.device, action),
    midiSetSliderAction: (state, action) =>
      midiActions.setSliderAction(state.device, action),
    setDmxConnectable: (state, action) =>
      midiActions.setDmxConnectable(state.device, action),
    setMidiConnectable: (state, action) =>
      midiActions.setMidiConnectable(state.device, action),
    removeMidiAction: (state, action) =>
      midiActions.removeMidiAction(state.device, action),
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
  setActiveSceneAutoEnabled,
  setActiveSceneName,
  reorderScene,
  copyActiveScene,
  sortScenesByBombacity,
  autoBombacity,

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
  setVisualSceneConfig,
  activeVisualSceneEffect_add,
  activeVisualSceneEffect_removeIndex,
  activeVisualSceneEffect_reorder,
  activeVisualScene_setActiveEffectIndex,
  activeVisualSceneEffect_set,

  // MIDI
  midiListen,
  midiSetButtonAction,
  midiSetIsEditing,
  midiSetSliderAction,
  setDmxConnectable,
  setMidiConnectable,
  removeMidiAction,
} = scenesSlice.actions

export default scenesSlice.reducer
