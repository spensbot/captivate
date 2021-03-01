import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initScene, Scene_t } from '../engine/scene_t'
import { LfoShape } from '../engine/oscillator'
import { ParamKey, PartialParams } from '../engine/params'
import { clampNormalized, clamp } from '../util/helpers'
import { initModulator } from '../engine/modulationEngine'
import { nanoid } from 'nanoid'

export interface SceneState_t {
  ids: string[],
  byId: {[key: string]: Scene_t},
  active: string
}

const initID = nanoid()

const initState: SceneState_t = {
  ids: [initID],
  byId: {
    [initID]: initScene()
  },
  active: initID
}

interface IncrementModulatorPayload {
  index: number
  flip: number
  phaseShift: number
  skew: number
  symmetricSkew: number
}

interface SetModulationPayload {
  index: number,
  param: ParamKey,
  value: number
}

function modifyActiveScene(state: SceneState_t, callback: (scene: Scene_t) => void) {
  if (state.active && state.byId[state.active]) {
    callback(state.byId[state.active])
  }
}

export const scenesSlice = createSlice({
  name: 'scenes',
  initialState: initState,
  reducers: {
    resetScenesState: (state, { payload }: PayloadAction<SceneState_t>) => {
      state.active = payload.active
      state.byId = payload.byId
      state.ids = payload.ids
    },
    addScene: (state, { payload }: PayloadAction<{ id: string, scene: Scene_t }>) => {
      state.ids.push(payload.id)
      state.byId[payload.id] = payload.scene
    },
    removeScene: (state, { payload }: PayloadAction<{ index: number }>) => {
      const id = state.ids[payload.index]
      state.ids.splice(payload.index, 1)
      delete state.byId[id]
    },
    setActiveScene: (state, { payload }: PayloadAction<string>) => {
      state.active = payload
    },
    setActiveSceneIndex: (state, { payload }: PayloadAction<number>) => {
      if (payload > -1 && state.ids.length > payload) {
        state.active = state.ids[payload]
      }
    },
    setModulatorShape: (state, { payload }: PayloadAction<{ index: number, shape: LfoShape }>) => {
      modifyActiveScene(state, scene => {
        scene.modulators[payload.index].lfo.shape = payload.shape
      })
    },
    incrementPeriod: (state, { payload }: PayloadAction<{ index: number, amount: number }>) => {
      modifyActiveScene(state, scene => {
        scene.modulators[payload.index].lfo.period = clamp(scene.modulators[payload.index].lfo.period + payload.amount, 0.25, 16)
      })
    },
    incrementModulator: (state, { payload }: PayloadAction<IncrementModulatorPayload>) => {
      modifyActiveScene(state, scene => {
        const modulator = scene.modulators[payload.index]
        modulator.lfo.flip = clampNormalized(modulator.lfo.flip + payload.flip)
        modulator.lfo.phaseShift = clampNormalized(modulator.lfo.phaseShift + payload.phaseShift)
        modulator.lfo.skew = clampNormalized(modulator.lfo.skew + payload.skew)
        modulator.lfo.symmetricSkew = clampNormalized(modulator.lfo.symmetricSkew + payload.symmetricSkew)
      })
    },
    addModulator: (state, _: PayloadAction<void>) => {
      modifyActiveScene(state, scene => {
        scene.modulators.push(initModulator())
      })
    },
    removeModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveScene(state, scene => {
        scene.modulators.splice(payload, 1)
      })
    },
    resetModulator: (state, { payload }: PayloadAction<number>) => {
      modifyActiveScene(state, scene => {
        scene.modulators[payload] = initModulator();
      })
    },
    setModulation: (state, { payload }: PayloadAction<SetModulationPayload>) => {
      const {index, param, value} = payload
      modifyActiveScene(state, scene => {
        scene.modulators[index].modulation[param] = value
      })
    },
    setBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveScene(state, scene => {
          scene.baseParams[key] = value
        })
      }
    },
    incrementBaseParams: (state, action: PayloadAction<PartialParams>) => {
      for (let [key, value] of Object.entries(action.payload)) {
        modifyActiveScene(state, scene => {
          scene.baseParams[key] = clampNormalized(scene.baseParams[key] + value)
        })
      }
    }
  },
});

export const {
  resetScenesState,
  addScene,
  removeScene,
  setActiveScene,
  setActiveSceneIndex,
  setBaseParams,
  incrementBaseParams,
  setModulatorShape,
  incrementPeriod,
  incrementModulator,
  addModulator,
  removeModulator,
  setModulation,
  resetModulator
} = scenesSlice.actions;

export default scenesSlice.reducer;
