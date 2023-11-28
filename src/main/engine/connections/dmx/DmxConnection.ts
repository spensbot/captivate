import { DmxDevice_t } from 'shared/connection'
import { DmxConnectionUsb } from './DmxConnectionUsb'
import { RealtimeState } from 'renderer/redux/realtimeStore'

export type DmxConnection = DmxConnectionUsb

export async function createDmxConnection(
  device: DmxDevice_t,
  getRealtimeState: () => RealtimeState
): Promise<DmxConnection> {
  return DmxConnectionUsb.create(device, getRealtimeState)
}
