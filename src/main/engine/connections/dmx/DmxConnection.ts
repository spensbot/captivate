import { DmxDevice_t } from 'shared/connection'
import { DmxConnectionUsb } from './DmxConnectionUsb'
import { EngineContext } from 'main/engine/engineContext'

export type DmxConnection = DmxConnectionUsb

export async function createDmxConnection(
  device: DmxDevice_t,
  c: EngineContext
): Promise<DmxConnection> {
  return DmxConnectionUsb.create(device, c)
}
