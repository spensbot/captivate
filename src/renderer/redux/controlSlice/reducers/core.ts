import { SliceCaseReducers } from '@reduxjs/toolkit'
import {
  LightScene_t,
  SceneType,
  ScenesStateBundle,
  VisualScene_t,
} from 'features/scenes/shared/Scenes'

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

export function modifyActiveVisualScene(
  state: ActionState,
  callback: (scene: VisualScene_t) => void
) {
  const scene = state.visual.byId[state.visual.active]
  if (scene) {
    callback(scene)
  }
}

export function modifyActiveScene(
  state: ActionState,
  sceneType: SceneType,
  callback: (scene: VisualScene_t | LightScene_t) => void
) {
  const scene = state[sceneType].byId[state[sceneType].active]
  if (scene) {
    callback(scene)
  }
}

export const createTypedReducers = <
  Reducers extends SliceCaseReducers<ActionState> = SliceCaseReducers<ActionState>
>(
  reducers: Reducers
) => {
  return reducers
}
