import type { TimeState } from './TimeState'
import type { Params } from './params'
import type { RandomizerState } from './randomizer'

/** Slim realtime payload for the Lighting 3D preview window (no atmospherics/audio bulk). */
export type Lighting3dRealtimeTick = {
  seq: number
  time: TimeState
  dmxOutByUniverse: number[][]
  splitStates: Array<
    | {
        outputParams: Params
        randomizer: RandomizerState
      }
    | undefined
  >
  master: number
}

/** Minimal slice of `RealtimeState` needed to build a preview tick (main + utility worker). */
export type Lighting3dRealtimeSlice = {
  time: TimeState
  dmxOutByUniverse: number[][]
  splitStates: Array<
    | { outputParams: Params; randomizer: RandomizerState }
    | undefined
  >
}

export function buildLighting3dPreviewTick(
  slice: Lighting3dRealtimeSlice,
  master: number,
  seq: number
): Lighting3dRealtimeTick {
  return {
    seq,
    time: slice.time,
    dmxOutByUniverse: slice.dmxOutByUniverse.map((u) => u.slice()),
    splitStates: slice.splitStates.map((s) =>
      s === undefined
        ? undefined
        : {
            outputParams: { ...s.outputParams },
            randomizer: s.randomizer,
          }
    ),
    master,
  }
}
