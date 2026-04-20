import type { RealtimeState } from '../../renderer/redux/realtimeStore'
import type { Lighting3dRealtimeTick } from '../../shared/lighting3dPreviewTransport'
import { buildLighting3dPreviewTick } from '../../shared/lighting3dPreviewTransport'

export function buildLighting3dRealtimeTick(
  rt: RealtimeState,
  master: number,
  seq: number
): Lighting3dRealtimeTick {
  return buildLighting3dPreviewTick(
    {
      time: rt.time,
      dmxOutByUniverse: rt.dmxOutByUniverse,
      splitStates: rt.splitStates,
    },
    master,
    seq
  )
}
