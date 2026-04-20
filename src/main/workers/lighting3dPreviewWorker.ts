/**
 * Utility process entry: builds Lighting 3D preview ticks off the main thread.
 * Loaded via `utilityProcess.fork()` from the main process.
 */
import { buildLighting3dPreviewTick } from '../../shared/lighting3dPreviewTransport'
import type { Lighting3dRealtimeSlice } from '../../shared/lighting3dPreviewTransport'

type TickMessage = {
  type: 'tick'
  seq: number
  master: number
} & Lighting3dRealtimeSlice

process.parentPort.on('message', (e: { data: unknown }) => {
  const msg = e.data as TickMessage
  if (msg?.type !== 'tick') {
    return
  }
  const tick = buildLighting3dPreviewTick(
    {
      time: msg.time,
      dmxOutByUniverse: msg.dmxOutByUniverse,
      splitStates: msg.splitStates,
    },
    msg.master,
    msg.seq
  )
  process.parentPort.postMessage({ type: 'tick_out', tick })
})
