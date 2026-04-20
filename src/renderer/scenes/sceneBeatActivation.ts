import type { SceneType } from '../../shared/Scenes'
import { msUntilNextBeatBoundary } from '../../shared/sceneBeatQuantize'
import { setActiveScene } from '../redux/controlSlice'
import type { ReduxDispatch } from '../redux/store'
import { realtimeStore } from '../redux/realtimeStore'

type Pending = { timerId: number; sceneId: string }

const pendingBySceneType: Partial<Record<SceneType, Pending>> = {}

/** Clears a pending quantized activation only if it was scheduled for this scene row. */
export function cancelQuantizedActiveScene(sceneType: SceneType, sceneId: string) {
  const p = pendingBySceneType[sceneType]
  if (p !== undefined && p.sceneId === sceneId) {
    clearTimeout(p.timerId)
    delete pendingBySceneType[sceneType]
  }
}

export function scheduleQuantizedSetActiveScene(
  dispatch: ReduxDispatch,
  sceneType: SceneType,
  sceneId: string
) {
  const existing = pendingBySceneType[sceneType]
  if (existing !== undefined) {
    clearTimeout(existing.timerId)
  }
  const delayMs = msUntilNextBeatBoundary(realtimeStore.getState().time)
  const timerId = window.setTimeout(() => {
    const cur = pendingBySceneType[sceneType]
    if (cur?.timerId === timerId && cur.sceneId === sceneId) {
      delete pendingBySceneType[sceneType]
      dispatch(setActiveScene({ sceneType, val: sceneId }))
    }
  }, delayMs)
  pendingBySceneType[sceneType] = { timerId, sceneId }
}
