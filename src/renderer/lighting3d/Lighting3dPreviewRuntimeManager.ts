import type { Lighting3dRealtimeTick } from '../../shared/lighting3dPreviewTransport'

export type Lighting3dTickSink = (tick: Lighting3dRealtimeTick) => void

/**
 * Applies throttled main-process DMX ticks to the Lighting 3D renderer without
 * touching the full IPC control-state mirror path or the main window Redux tree.
 */
export const lighting3dPreviewRuntimeManager = {
  /** Latest master from preview ticks (Lighting 3D does not mirror full control state). */
  master: 1,

  registerTickSink(sink: Lighting3dTickSink): () => void {
    tickSink = sink
    return () => {
      if (tickSink === sink) {
        tickSink = null
      }
    }
  },

  applyTick(tick: Lighting3dRealtimeTick) {
    this.master = tick.master
    if (tickSink !== null) {
      tickSink(tick)
    }
  },
}

let tickSink: Lighting3dTickSink | null = null
