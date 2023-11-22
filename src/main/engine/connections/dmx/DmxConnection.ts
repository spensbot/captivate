import { DmxDevice_t } from 'shared/connection'
import { DmxConnectionUsb } from './DmxConnectionUsb'

export type DmxConnection = DmxConnectionUsb

export async function createDmxConnection(
  device: DmxDevice_t
): Promise<DmxConnection> {
  return DmxConnectionUsb.create(device)
}
