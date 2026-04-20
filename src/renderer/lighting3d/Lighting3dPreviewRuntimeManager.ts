import type { Lighting3dRealtimeTick } from '../../shared/lighting3dPreviewTransport'
import { store } from '../redux/store'
import {
  realtimeStore,
  update as updateRealtimeStore,
  type RealtimeState,
  type SplitState,
} from '../redux/realtimeStore'
import { setMaster } from '../redux/controlSlice'

/**
 * Applies throttled main-process DMX ticks to the Lighting 3D renderer without
 * touching the full IPC control-state mirror path.
 */
export const lighting3dPreviewRuntimeManager = {
  applyTick(tick: Lighting3dRealtimeTick) {
    const prev = realtimeStore.getState()
    const nextSplitStates = prev.splitStates.map(
      (existing: SplitState | undefined, index: number) => {
        const incoming = tick.splitStates[index]
        if (incoming === undefined) {
          return existing
        }
        if (existing === undefined) {
          return {
            outputParams: incoming.outputParams,
            randomizer: incoming.randomizer,
          }
        }
        return {
          ...existing,
          outputParams: incoming.outputParams,
          randomizer: incoming.randomizer,
        }
      }
    ) as RealtimeState['splitStates']

    const dmxOutByUniverse = tick.dmxOutByUniverse.map((u) => u.slice())
    const dmxOut =
      dmxOutByUniverse[0] !== undefined
        ? dmxOutByUniverse[0].slice()
        : prev.dmxOut.slice()

    realtimeStore.dispatch(
      updateRealtimeStore({
        ...prev,
        time: tick.time,
        dmxOut,
        dmxOutByUniverse,
        splitStates: nextSplitStates,
      })
    )
    const nextMaster = tick.master
    if (store.getState().control.present.master !== nextMaster) {
      store.dispatch(setMaster(nextMaster))
    }
  },
}
