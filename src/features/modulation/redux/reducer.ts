import { PayloadAction } from '@reduxjs/toolkit'
import { LightScene_t } from 'features/scenes/shared/Scenes'
import { clamp, clampNormalized } from 'features/utils/math/util'
import {
  ActionState,
  createTypedReducers,
  modifyActiveLightScene,
} from 'renderer/redux/controlSlice/reducers/actions'
import { LfoShape } from '../shared/oscillator'
import { initModulator } from '../shared/modulation'

const modifyScene = {
  light: {
    active: modifyActiveLightScene,
    byId: (
      state: ActionState,
      sceneId: string,
      callback: (scene: LightScene_t) => void
    ) => {
      const scene = state.light.byId[sceneId]
      if (scene) {
        callback(scene)
      }
    },
  },
}

export interface IncrementModulatorPayload {
  index: number
  flip: number
  phaseShift: number
  skew: number
  symmetricSkew: number
}

export const modulationActionReducer = createTypedReducers({
  // Update modulators
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
    {
      payload,
    }: PayloadAction<{ index: number; newVal: number; sceneId?: string }>
  ) => {
    const handle = (scene: LightScene_t) => {
      scene.modulators[payload.index].lfo.period = payload.newVal
    }
    if (payload.sceneId) {
      modifyScene.light.byId(state, payload.sceneId, handle)
    } else {
      modifyActiveLightScene(state, handle)
    }
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
  // Create and Delete modulators
  addModulator: (state, _: PayloadAction<void>) => {
    modifyActiveLightScene(state, (scene) => {
      scene.modulators.push(initModulator(scene.splitScenes.length))
    })
  },
  removeModulator: (state, { payload }: PayloadAction<number>) => {
    modifyActiveLightScene(state, (scene) => {
      scene.modulators.splice(payload, 1)
    })
  },
  resetModulator: (state, { payload }: PayloadAction<number>) => {
    modifyActiveLightScene(state, (scene) => {
      scene.modulators[payload] = initModulator(scene.splitScenes.length)
    })
  },
})
