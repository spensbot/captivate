import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initScene, Scene_t } from '../../engine/scene_t'
import { nanoid } from 'nanoid'
import cloneDeep from 'lodash.clonedeep'
import { AutoScene_t } from './scenesSlice'

type ID = string

export interface VScene_t {
  name: string
  bombacity: number
}

export interface VisualizerState {
  ids: ID[]
  byId: { [key: ID]: VScene_t }
  active: ID
  auto: AutoScene_t
}

export function initSceneState(): VisualizerState {
  const initID = nanoid()
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
  }
}

function modifyActiveScene(
  state: VisualizerState,
  callback: (scene: VScene_t) => void
) {
  if (state.active && state.byId[state.active]) {
    callback(state.byId[state.active])
  }
}

export const visualizerSlice = createSlice({
  name: 'visualizer',
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
    addScene: (
      state,
      { payload }: PayloadAction<{ id: string; scene: Scene_t }>
    ) => {
      state.ids.push(payload.id)
      state.byId[payload.id] = payload.scene
      state.active = payload.id
    },
    removeScene: (state, { payload }: PayloadAction<{ index: number }>) => {
      const id = state.ids[payload.index]
      state.ids.splice(payload.index, 1)
      delete state.byId[id]
      // This is necessary in a world where you can delete the active scene... Which you currently can't
      // if (state.active === id) {
      //   state.active = state.ids[0]
      // }
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
  addScene,
  removeScene,
  setActiveScene,
  setActiveSceneIndex,
  setActiveSceneBombacity,
  setActiveSceneName,
  reorderScene,
  copyActiveScene,
} = visualizerSlice.actions

export default visualizerSlice.reducer
