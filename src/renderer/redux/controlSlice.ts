import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LfoShape, normalizeLfoShape } from '../../shared/oscillator'
import { DefaultParam, Params } from '../../shared/params'
import { ReorderParams } from '../../shared/util'
import { clampNormalized, clamp } from '../../math/util'
import {
  quantizeBeatEighth,
  quantizePhaseShiftToBeatEighth,
} from '../../shared/lfoPeriod'
import {
  initModulator,
  type ModManualAnchor,
  type SplitModShaping,
  normSplitShapingForStore,
} from '../../shared/modulation'
import { nanoid } from 'nanoid'
import { RandomizerOptions } from '../../shared/randomizer'
import cloneDeep from 'lodash.clonedeep'
import { LayerConfig } from '../../visualizer/threejs/layers/LayerConfig'
import { DeviceState, initDeviceState, midiActions } from './deviceState'
import {
  AtmosFxtrConfig,
  AtmosLevelChConfig,
  AtmosTrigChConfig,
} from '../../shared/atmospherics'
import {
  ScenesStateBundle,
  initScenesState,
  initLightScene,
  initVisualScene,
  initVisualScenesState,
  LightScene_t,
  LightScenes_t,
  SplitScene_t,
  VisualScene_t,
  VisualScenes_t,
  SceneType,
  initSplitScene,
  VisualSceneTransitionConfig,
} from '../../shared/Scenes'
import { reorderArray } from '../../shared/util'
import { normalizeAudioBandConfig } from '../../shared/audioEngine'

export interface ControlState extends ScenesStateBundle {
  device: DeviceState
  master: number
}
export function initControlState(): ControlState {
  return {
    light: initScenesState(initLightScene()),
    visual: initVisualScenesState(),
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
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
  value: number | undefined
}

interface SetModManualAnchorPayload {
  splitIndex: number
  param: DefaultParam | string
  /** Omit or `'center'` clears stored anchor (default center behavior). */
  anchor?: ModManualAnchor
}

interface SetSplitModShapingPayload {
  splitIndex: number
  /** Full replacement; normalized before store (empty → field removed). */
  shaping: SplitModShaping | undefined
}

interface SetModulatorAudioConfigPayload {
  index: number
  audioBandLowHz?: number
  audioBandHighHz?: number
  audioThreshold?: number
  audioMax?: number
  audioAttack?: number
  audioDecay?: number
  audioEnergySmoothing?: number
  audioBandSmoothing?: number
}

interface SetModulatorWaveConfigPayload {
  index: number
  skew?: number
  sinePeakWidth?: number
  rampCurve?: number
  squareDuty?: number
  sawFlatten?: number
  noiseSeed?: number
  noiseSmoothing?: number
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

function getSplitSceneSafe(
  scene: LightScene_t,
  splitIndex: number
): LightScene_t['splitScenes'][number] | undefined {
  if (!Number.isInteger(splitIndex)) {
    return undefined
  }
  if (splitIndex < 0 || splitIndex >= scene.splitScenes.length) {
    return undefined
  }
  return scene.splitScenes[splitIndex]
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

function cloneProjectionMappingConfig(
  mapping: LayerConfig['projectionMapping']
): LayerConfig['projectionMapping'] {
  return {
    enabled: mapping.enabled === true,
    showAlignmentGrid: mapping.showAlignmentGrid !== false,
    showKeystoneGrid: mapping.showKeystoneGrid !== false,
    showSelectedOutputGrid: mapping.showSelectedOutputGrid === true,
    activeOutputId: mapping.activeOutputId,
    outputs: mapping.outputs.map((output) => ({
      id: output.id,
      name: output.name,
      enabled: output.enabled !== false,
      sourceRect: { ...output.sourceRect },
      corners: [
        { ...output.corners[0] },
        { ...output.corners[1] },
        { ...output.corners[2] },
        { ...output.corners[3] },
      ],
    })),
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

type ParamsAction = PayloadAction<{
  splitIndex: number
  params: Params
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
      state[sceneType].auto.epicness = val
    },
    setAutoScenePeriod: (
      state,
      { payload: { sceneType, val } }: ScopedAction<number>
    ) => {
      state[sceneType].auto.period = val
    },
    setAutoSceneMatchAudioEnergy: (
      state,
      { payload: { sceneType, val } }: ScopedAction<boolean>
    ) => {
      state[sceneType].auto.matchAudioEnergy = val
    },
    setAutoSceneEnergyMatchEnabled: (
      state,
      { payload: { sceneType, val } }: ScopedAction<boolean>
    ) => {
      state[sceneType].auto.energyMatchEnabled = val
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
        const nextSceneId = scenes.ids[val]
        scenes.active = nextSceneId
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
      const count = scenes.ids.length
      if (count === 0) return
      if (count === 1) {
        const onlyScene = scenes.byId[scenes.ids[0]]
        if (onlyScene) onlyScene.epicness = 0
        return
      }
      scenes.ids.forEach((id, i) => {
        const scene = scenes.byId[id]
        if (scene) scene.epicness = i / (count - 1)
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
        const nextShape = normalizeLfoShape(payload.shape)
        scene.modulators[payload.index].lfo.shape = nextShape
        if (nextShape === LfoShape.AudioBand) {
          const lfo = scene.modulators[payload.index].lfo
          const cap = 0.65
          if (lfo.audioMax > cap) {
            lfo.audioMax = cap
          }
          if (lfo.audioMax <= lfo.audioThreshold) {
            lfo.audioMax = Math.min(cap, lfo.audioThreshold + 0.01)
          }
        }
      })
    },
    setModulatorAudioConfig: (
      state,
      { payload }: PayloadAction<SetModulatorAudioConfigPayload>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const modulator = scene.modulators[payload.index]
        if (modulator === undefined) return
        if (
          payload.audioBandLowHz !== undefined ||
          payload.audioBandHighHz !== undefined
        ) {
          const band = normalizeAudioBandConfig({
            lowHz:
              payload.audioBandLowHz !== undefined
                ? payload.audioBandLowHz
                : modulator.lfo.audioBandLowHz,
            highHz:
              payload.audioBandHighHz !== undefined
                ? payload.audioBandHighHz
                : modulator.lfo.audioBandHighHz,
          })
          modulator.lfo.audioBandLowHz = band.lowHz
          modulator.lfo.audioBandHighHz = band.highHz
        }
        if (payload.audioAttack !== undefined) {
          modulator.lfo.audioAttack = clampNormalized(payload.audioAttack)
        }
        if (payload.audioDecay !== undefined) {
          modulator.lfo.audioDecay = clampNormalized(payload.audioDecay)
        }
        if (payload.audioThreshold !== undefined) {
          modulator.lfo.audioThreshold = Math.min(
            0.99,
            clampNormalized(payload.audioThreshold)
          )
        }
        if (payload.audioMax !== undefined) {
          modulator.lfo.audioMax = clampNormalized(payload.audioMax)
        }
        if (modulator.lfo.audioMax <= modulator.lfo.audioThreshold) {
          modulator.lfo.audioMax = Math.min(1, modulator.lfo.audioThreshold + 0.01)
        }
        if (payload.audioEnergySmoothing !== undefined) {
          modulator.lfo.audioEnergySmoothing = clampNormalized(
            payload.audioEnergySmoothing
          )
        }
        if (payload.audioBandSmoothing !== undefined) {
          modulator.lfo.audioBandSmoothing = clampNormalized(
            payload.audioBandSmoothing
          )
        }
      })
    },
    setModulatorWaveConfig: (
      state,
      { payload }: PayloadAction<SetModulatorWaveConfigPayload>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const modulator = scene.modulators[payload.index]
        if (modulator === undefined) return
        if (payload.skew !== undefined) {
          modulator.lfo.skew = clampNormalized(payload.skew)
        }
        if (payload.sinePeakWidth !== undefined) {
          modulator.lfo.sinePeakWidth = clampNormalized(payload.sinePeakWidth)
        }
        if (payload.rampCurve !== undefined) {
          modulator.lfo.rampCurve = clampNormalized(payload.rampCurve)
        }
        if (payload.squareDuty !== undefined) {
          modulator.lfo.squareDuty = clampNormalized(payload.squareDuty)
        }
        if (payload.sawFlatten !== undefined) {
          modulator.lfo.sawFlatten = clampNormalized(payload.sawFlatten)
        }
        if (payload.noiseSeed !== undefined) {
          modulator.lfo.noiseSeed = clampNormalized(payload.noiseSeed)
        }
        if (payload.noiseSmoothing !== undefined) {
          modulator.lfo.noiseSmoothing = clampNormalized(payload.noiseSmoothing)
        }
      })
    },
    setPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; newVal: number }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload.index].lfo.period = clamp(
          quantizeBeatEighth(payload.newVal),
          0.25,
          32
        )
      })
    },
    incrementPeriod: (
      state,
      { payload }: PayloadAction<{ index: number; amount: number }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload.index].lfo.period = clamp(
          quantizeBeatEighth(
            scene.modulators[payload.index].lfo.period + payload.amount
          ),
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
        modulator.lfo.phaseShift = quantizePhaseShiftToBeatEighth(
          modulator.lfo.phaseShift + payload.phaseShift,
          modulator.lfo.period
        )
        modulator.lfo.skew = clampNormalized(modulator.lfo.skew + payload.skew)
        modulator.lfo.symmetricSkew = clampNormalized(
          modulator.lfo.symmetricSkew + payload.symmetricSkew
        )
      })
    },
    addModulator: (state, _: PayloadAction<void>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators.push(initModulator(scene.splitScenes.length))
      })
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators.splice(payload, 1)
        const prefix = 'intermod:lfo:'
        scene.modulators.forEach((modulator) => {
          modulator.splitModulations = modulator.splitModulations.map((splitMod) => {
            if (!splitMod) return {}
            const remapped: Record<string, number | undefined> = {}
            for (const [key, value] of Object.entries(splitMod)) {
              if (!key.startsWith(prefix)) {
                remapped[key] = value
                continue
              }
              const [targetRaw, prop] = key.slice(prefix.length).split(':')
              const targetIndex = Number(targetRaw)
              if (!Number.isInteger(targetIndex) || !prop) {
                remapped[key] = value
                continue
              }
              if (targetIndex === payload) {
                continue
              }
              if (targetIndex > payload) {
                remapped[`${prefix}${targetIndex - 1}:${prop}`] = value
              } else {
                remapped[key] = value
              }
            }
            return remapped
          })
          const im = modulator.lfoInterModulation
          if (im === undefined) return
          const nextIm: Record<string, number> = {}
          for (const [key, value] of Object.entries(im)) {
            if (typeof value !== 'number' || !Number.isFinite(value)) continue
            if (!key.startsWith(prefix)) continue
            const remainder = key.slice(prefix.length)
            const [targetRaw, prop] = remainder.split(':')
            const targetIndex = Number(targetRaw)
            if (!Number.isInteger(targetIndex) || !prop) continue
            if (targetIndex === payload) continue
            const newT = targetIndex > payload ? targetIndex - 1 : targetIndex
            nextIm[`${prefix}${newT}:${prop}`] = value
          }
          if (Object.keys(nextIm).length > 0) {
            modulator.lfoInterModulation = nextIm
          } else {
            delete modulator.lfoInterModulation
          }
        })
      })
    },
    resetModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLightScene(state, (scene) => {
        scene.modulators[payload] = initModulator(scene.splitScenes.length)
      })
    },
    setModManualAnchor: (
      state,
      { payload }: PayloadAction<SetModManualAnchorPayload>
    ) => {
      const { splitIndex, param, anchor } = payload
      modifyActiveLightScene(state, (scene) => {
        const splitScene = getSplitSceneSafe(scene, splitIndex)
        if (splitScene === undefined) {
          return
        }
        if (anchor === undefined || anchor === 'center') {
          if (splitScene.modManualAnchors) {
            delete splitScene.modManualAnchors[param]
            if (Object.keys(splitScene.modManualAnchors).length === 0) {
              delete splitScene.modManualAnchors
            }
          }
          return
        }
        if (!splitScene.modManualAnchors) {
          splitScene.modManualAnchors = {}
        }
        splitScene.modManualAnchors[param] = anchor
      })
    },
    setSplitModShaping: (
      state,
      { payload }: PayloadAction<SetSplitModShapingPayload>
    ) => {
      const { splitIndex, shaping } = payload
      modifyActiveLightScene(state, (scene) => {
        const splitScene = getSplitSceneSafe(scene, splitIndex)
        if (splitScene === undefined) {
          return
        }
        const stored = normSplitShapingForStore(shaping)
        if (stored === undefined) {
          delete splitScene.splitModShaping
        } else {
          splitScene.splitModShaping = stored
        }
      })
    },
    setModulation: (
      state,
      { payload }: PayloadAction<SetModulationPayload>
    ) => {
      const { splitIndex, modIndex, param, value } = payload
      modifyActiveLightScene(state, (scene) => {
        const modulator = scene.modulators[modIndex]
        if (modulator === undefined) return

        if (typeof param === 'string' && param.startsWith('intermod:lfo:')) {
          if (modulator.lfoInterModulation === undefined) {
            modulator.lfoInterModulation = {}
          }
          const im = modulator.lfoInterModulation
          if (value === undefined) {
            delete im[param]
          } else {
            im[param] = value
          }
          if (Object.keys(im).length === 0) {
            delete modulator.lfoInterModulation
          }
          return
        }

        while (modulator.splitModulations.length <= splitIndex) {
          modulator.splitModulations.push({})
        }

        const splitModulation =
          modulator.splitModulations[splitIndex] ??
          (modulator.splitModulations[splitIndex] = {})

        if (value === undefined) {
          delete splitModulation[param]
        } else {
          splitModulation[param] = value
        }
      })
    },
    setBaseParams: (
      state,
      { payload: { params, splitIndex } }: ParamsAction
    ) => {
      for (let [key, value] of Object.entries(params)) {
        modifyActiveLightScene(state, (scene) => {
          const splitScene = getSplitSceneSafe(scene, splitIndex)
          if (splitScene === undefined) {
            return
          }
          const baseParams = splitScene.baseParams
          baseParams[key] = value
        })
      }
    },
    deleteBaseParams: (
      state,
      {
        payload: { params, splitIndex },
      }: PayloadAction<{
        splitIndex: number
        params: readonly (DefaultParam | string)[]
      }>
    ) => {
      for (const param of params) {
        modifyActiveLightScene(state, (scene) => {
          const splitScene = getSplitSceneSafe(scene, splitIndex)
          if (splitScene === undefined) {
            return
          }
          const baseParams = splitScene.baseParams
          delete baseParams[param]
          if (splitScene.modManualAnchors) {
            delete splitScene.modManualAnchors[param]
            if (Object.keys(splitScene.modManualAnchors).length === 0) {
              delete splitScene.modManualAnchors
            }
          }

          // Now remove the params from any modulators
          scene.modulators.forEach((modulator) => {
            const modulation = modulator.splitModulations[splitIndex]
            if (modulation !== undefined) {
              delete modulation[param]
            }
            const im = modulator.lfoInterModulation
            if (im !== undefined && param in im) {
              delete im[param]
              if (Object.keys(im).length === 0) {
                delete modulator.lfoInterModulation
              }
            }
          })
        })
      }
    },
    incrementBaseParams: (
      state,
      { payload: { params, splitIndex } }: ParamsAction
    ) => {
      for (let [key, amount] of Object.entries(params)) {
        modifyActiveLightScene(state, (scene) => {
          if (amount !== undefined) {
            const splitScene = getSplitSceneSafe(scene, splitIndex)
            if (splitScene === undefined) {
              return
            }
            const baseParams = splitScene.baseParams
            const currentVal = baseParams[key as DefaultParam]
            if (currentVal !== undefined) {
              baseParams[key as DefaultParam] = clampNormalized(
                currentVal + amount
              )
            }
          }
        })
      }
    },
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
        const splitScene = getSplitSceneSafe(scene, splitIndex)
        if (splitScene === undefined) {
          return
        }
        splitScene.randomizer[key] = value
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
    ensureSplitSceneForGroup: (
      state,
      {
        payload,
      }: PayloadAction<{
        group: string
        defaultParams?: Params
        removeParams?: string[]
      }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const group = payload.group.trim()
        if (group.length <= 0) return

        let splitIndex = scene.splitScenes.findIndex(
          (split) => split.groups[group] === true
        )
        if (splitIndex < 0) {
          scene.splitScenes.push(initSplitScene())
          scene.modulators.forEach((modulator) => {
            modulator.splitModulations.push({})
          })
          splitIndex = scene.splitScenes.length - 1
          scene.splitScenes[splitIndex].groups[group] = true
        }

        const split = scene.splitScenes[splitIndex]
        split.groups[group] = true
        if (payload.defaultParams === undefined) {
          // still allow param removals on existing splits
        } else {
          for (const [param, value] of Object.entries(payload.defaultParams)) {
            if (split.baseParams[param] === undefined) {
              split.baseParams[param] = value
            }
          }
        }

        if (Array.isArray(payload.removeParams)) {
          for (const param of payload.removeParams) {
            if (typeof param !== 'string' || param.trim().length <= 0) continue
            delete split.baseParams[param]
            if (split.modManualAnchors) {
              delete split.modManualAnchors[param]
              if (Object.keys(split.modManualAnchors).length === 0) {
                delete split.modManualAnchors
              }
            }
            for (const modulator of scene.modulators) {
              const modulation = modulator.splitModulations[splitIndex]
              if (modulation !== undefined) {
                delete modulation[param]
              }
            }
          }
        }
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
    removeDedicatedSplitSceneForGroup: (
      state,
      { payload }: PayloadAction<{ group: string }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const group = payload.group.trim()
        if (group.length <= 0) return

        const splitIndex = scene.splitScenes.findIndex((split) => {
          const entries = Object.entries(split.groups).filter(
            ([, included]) => included !== undefined
          )
          return (
            entries.length === 1 &&
            entries[0]![0] === group &&
            entries[0]![1] === true
          )
        })
        if (splitIndex < 0) return

        scene.splitScenes.splice(splitIndex, 1)
        scene.modulators.forEach((modulator) => {
          modulator.splitModulations.splice(splitIndex, 1)
        })
      })
    },
    restoreSplitSceneForGroup: (
      state,
      {
        payload,
      }: PayloadAction<{
        group: string
        splitScene: SplitScene_t
        splitModulations: Array<{ [key: string]: number | undefined }>
      }>
    ) => {
      modifyActiveLightScene(state, (scene) => {
        const group = payload.group.trim()
        if (group.length <= 0) return

        const restoredSplit: SplitScene_t = {
          baseParams: { ...payload.splitScene.baseParams },
          randomizer: { ...payload.splitScene.randomizer },
          groups: { ...payload.splitScene.groups, [group]: true },
          ...(payload.splitScene.modManualAnchors
            ? { modManualAnchors: { ...payload.splitScene.modManualAnchors } }
            : {}),
        }

        let splitIndex = scene.splitScenes.findIndex(
          (split) => split.groups[group] === true
        )
        if (splitIndex < 0) {
          scene.splitScenes.push(restoredSplit)
          splitIndex = scene.splitScenes.length - 1
          scene.modulators.forEach((modulator, modIndex) => {
            const nextModulation = payload.splitModulations[modIndex]
            modulator.splitModulations.push(
              nextModulation ? { ...nextModulation } : {}
            )
          })
          return
        }

        scene.splitScenes[splitIndex] = restoredSplit
        scene.modulators.forEach((modulator, modIndex) => {
          while (modulator.splitModulations.length <= splitIndex) {
            modulator.splitModulations.push({})
          }
          const nextModulation = payload.splitModulations[modIndex]
          modulator.splitModulations[splitIndex] = nextModulation
            ? { ...nextModulation }
            : {}
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
    /** Drop Visualizer include/exclude from every split (e.g. visualizer window closed). */
    clearVisualizerGroupFiltersFromSplits: (state) => {
      modifyActiveLightScene(state, (scene) => {
        for (const split of scene.splitScenes) {
          if (split.groups.Visualizer !== undefined) {
            delete split.groups.Visualizer
          }
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
    setAllVisualScenesProjectionMapping: (
      state,
      { payload }: PayloadAction<LayerConfig['projectionMapping']>
    ) => {
      const next = cloneProjectionMappingConfig(payload)
      for (const sceneId of state.visual.ids) {
        const scene = state.visual.byId[sceneId]
        if (scene === undefined) continue
        scene.config.projectionMapping = cloneProjectionMappingConfig(next)
      }
    },
    setActiveVisualSceneTransition: (
      state,
      { payload }: PayloadAction<Partial<VisualSceneTransitionConfig>>
    ) => {
      modifyActiveVisualScene(state, (scene) => {
        scene.transition = {
          ...scene.transition,
          ...payload,
        }
      })
    },

    // =====================   MIDI   ===========================================
    midiListen: (state, action) => midiActions.listen(state.device, action),
    keyboardListen: (state, action) =>
      midiActions.keyboardListen(state.device, action),
    clearKeyboardListening: (state) =>
      midiActions.clearKeyboardListening(state.device),
    midiSetKeyboardLearnMode: (state, action) =>
      midiActions.setKeyboardLearnMode(state.device, action),
    setKeyboardShortcut: (state, action) =>
      midiActions.setKeyboardShortcut(state.device, action),
    removeKeyboardChord: (state, action) =>
      midiActions.removeKeyboardChord(state.device, action),
    clearButtonMapping: (state, action) =>
      midiActions.clearButtonMapping(state.device, action),
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
    setArtNetConnectable: (state, action) =>
      midiActions.setArtNetConnectable(state.device, action),
    setOpenDmxRefreshRateHz: (state, action) =>
      midiActions.setOpenDmxRefreshRateHz(state.device, action),
    setUniverseCount: (state, action) =>
      midiActions.setUniverseCount(state.device, action),
    setDmxDeviceUniverse: (state, action) =>
      midiActions.setDmxDeviceUniverse(state.device, action),
    setDmxUsbWidgetProtocol: (state, action) =>
      midiActions.setDmxUsbWidgetProtocol(state.device, action),
    setArtNetUniverseRoute: (state, action) =>
      midiActions.setArtNetUniverseRoute(state.device, action),
    setAudioInputEnabled: (state, action) =>
      midiActions.setAudioInputEnabled(state.device, action),
    setAudioInputDeviceId: (state, action) =>
      midiActions.setAudioInputDeviceId(state.device, action),
    setAudioInputGain: (state, action) =>
      midiActions.setAudioInputGain(state.device, action),
    setAudioInputAutoGainControl: (state, action) =>
      midiActions.setAudioInputAutoGainControl(state.device, action),
    setAudioBeatClockEnabled: (state, action) =>
      midiActions.setAudioBeatClockEnabled(state.device, action),
    setMidiClockBpmEnabled: (state, action) =>
      midiActions.setMidiClockBpmEnabled(state.device, action),
    setLinkEnabled: (state, action) =>
      midiActions.setLinkEnabled(state.device, action),
    setLinkStartStopSyncEnabled: (state, action) =>
      midiActions.setLinkStartStopSyncEnabled(state.device, action),
    setAudioBeatSensitivity: (state, action) =>
      midiActions.setAudioBeatSensitivity(state.device, action),
    setAudioBeatMinIntervalMs: (state, action) =>
      midiActions.setAudioBeatMinIntervalMs(state.device, action),
    setAudioBpmSmoothing: (state, action) =>
      midiActions.setAudioBpmSmoothing(state.device, action),
    setAudioEnergySmoothing: (state, action) =>
      midiActions.setAudioEnergySmoothing(state.device, action),
    setAudioEnergyDynamics: (state, action) =>
      midiActions.setAudioEnergyDynamics(state.device, action),
    setAudioEnergyRhythmBias: (state, action) =>
      midiActions.setAudioEnergyRhythmBias(state.device, action),
    setAudioBeatTapHint: (state, action) =>
      midiActions.setAudioBeatTapHint(state.device, action),
    clearAudioBeatTapHint: (state) => midiActions.clearAudioBeatTapHint(state.device),
    setAudioBpmRangePreset: (state, action) =>
      midiActions.setAudioBpmRangePreset(state.device, action),
    setAudioBpmRangeCustom: (state, action) =>
      midiActions.setAudioBpmRangeCustom(state.device, action),
    setAtmosOn: (state, action) =>
      midiActions.setAtmosOn(state.device, action),
    setAtmosArmed: (state, action) =>
      midiActions.setAtmosArmed(state.device, action),
    setAtmosEStop: (state, action) =>
      midiActions.setAtmosEStop(state.device, action),
    setAtmosPyro: (state, action) =>
      midiActions.setAtmosPyro(state.device, action),
    setAtmosLevelCap: (state, action) =>
      midiActions.setAtmosLevelCap(state.device, action),
    ensureAtmosFxtrConfig: (
      state,
      action: PayloadAction<string>
    ) => midiActions.ensureAtmosFxtrConfig(state.device, action),
    removeAtmosFxtr: (state, action: PayloadAction<string>) =>
      midiActions.removeAtmosFxtr(state.device, action),
    selectAtmosFxtr: (
      state,
      action: PayloadAction<string | null>
    ) => midiActions.selectAtmosFxtr(state.device, action),
    patchAtmosFxtr: (
      state,
      action: PayloadAction<{
        fixtureId: string
        patch: Partial<Omit<AtmosFxtrConfig, 'fixtureId' | 'source' | 'auxChannels'>>
      }>
    ) => midiActions.patchAtmosFxtr(state.device, action),
    setAtmosFxtrGroup: (
      state,
      action: PayloadAction<{
        fixtureId: string
        groupName: string
      }>
    ) => midiActions.setAtmosFxtrGroup(state.device, action),
    patchAtmosTrigCh: (
      state,
      action: PayloadAction<{
        fixtureId: string
        channelNumber: number
        patch: Partial<AtmosTrigChConfig>
      }>
    ) => midiActions.patchAtmosTrigCh(state.device, action),
    patchAtmosLevelCh: (
      state,
      action: PayloadAction<{
        fixtureId: string
        channelNumber: number
        patch: Partial<AtmosLevelChConfig>
      }>
    ) => midiActions.patchAtmosLevelCh(state.device, action),
  },
})

export const {
  setMaster,

  // LIGHT & VISUAL SCENES
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  setAutoSceneMatchAudioEnergy,
  setAutoSceneEnergyMatchEnabled,
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
  deleteBaseParams,
  incrementBaseParams,
  setModulatorShape,
  setModulatorAudioConfig,
  setModulatorWaveConfig,
  setPeriod,
  incrementPeriod,
  incrementModulator,
  addModulator,
  removeModulator,
  setModulation,
  setModManualAnchor,
  setSplitModShaping,
  resetModulator,
  setRandomizer,
  addSplitScene,
  ensureSplitSceneForGroup,
  removeSplitSceneByIndex,
  removeDedicatedSplitSceneForGroup,
  restoreSplitSceneForGroup,

  setSceneGroup,
  clearVisualizerGroupFiltersFromSplits,

  // VISUAL SCENES
  resetVisualScenes,
  setVisualSceneConfig,
  setAllVisualScenesProjectionMapping,
  setActiveVisualSceneTransition,

  // MIDI
  midiListen,
  keyboardListen,
  clearKeyboardListening,
  midiSetKeyboardLearnMode,
  setKeyboardShortcut,
  removeKeyboardChord,
  clearButtonMapping,
  midiSetButtonAction,
  midiSetIsEditing,
  midiSetSliderAction,
  setDmxConnectable,
  setMidiConnectable,
  removeMidiAction,
  setArtNetConnectable,
  setOpenDmxRefreshRateHz,
  setUniverseCount,
  setDmxDeviceUniverse,
  setDmxUsbWidgetProtocol,
  setArtNetUniverseRoute,
  setAudioInputEnabled,
  setAudioInputDeviceId,
  setAudioInputGain,
  setAudioInputAutoGainControl,
  setAudioBeatClockEnabled,
  setMidiClockBpmEnabled,
  setLinkEnabled,
  setLinkStartStopSyncEnabled,
  setAudioBeatSensitivity,
  setAudioBeatMinIntervalMs,
  setAudioBpmSmoothing,
  setAudioEnergySmoothing,
  setAudioEnergyDynamics,
  setAudioEnergyRhythmBias,
  setAudioBeatTapHint,
  clearAudioBeatTapHint,
  setAudioBpmRangePreset,
  setAudioBpmRangeCustom,
  setAtmosOn,
  setAtmosArmed,
  setAtmosEStop,
  setAtmosPyro,
  setAtmosLevelCap,
  ensureAtmosFxtrConfig,
  removeAtmosFxtr,
  selectAtmosFxtr,
  patchAtmosFxtr,
  setAtmosFxtrGroup,
  patchAtmosTrigCh,
  patchAtmosLevelCh,
} = scenesSlice.actions

export default scenesSlice.reducer

