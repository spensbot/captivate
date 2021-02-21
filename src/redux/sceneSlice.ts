import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Scene_t } from '../engine/scene_t'
import { LfoShape } from '../engine/oscillator'
import { ParamKey, PartialParams } from '../engine/params'
import { clampNormalized, clamp } from '../util/helpers'
import { initModulator } from '../engine/modulationEngine'

interface SceneState_t {
  sceneIds: string[],
  scenesById: {[key: string]: Scene_t},
  activeScene: string | null
}

const initState: SceneState_t = {
  sceneIds: [],
  scenesById: {},
  activeScene: null
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
  if (state.activeScene && state.scenesById[state.activeScene]) {
    callback(state.scenesById[state.activeScene])
  }
}

export const scenesSlice = createSlice({
  name: 'scenes',
  initialState: initState,
  reducers: {
    addScene: (state, { payload }: PayloadAction<{ id: string, scene: Scene_t }>) => {
      state.sceneIds.push(payload.id)
      state.scenesById[payload.id] = payload.scene
    },
    removeScene: (state, { payload }: PayloadAction<{ index: number }>) => {
      const id = state.sceneIds[payload.index]
      state.sceneIds.splice(payload.index, 1)
      delete state.scenesById[id]
    },
    setActiveScene: (state, { payload }: PayloadAction<string | null>) => {
      state.activeScene = payload
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

export const { setBaseParams, incrementBaseParams, setModulatorShape, incrementPeriod, incrementModulator, addModulator, removeModulator, setModulation, resetModulator } = scenesSlice.actions;

export default scenesSlice.reducer;
