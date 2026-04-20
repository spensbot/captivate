import { EngineContext } from 'main/engine/engineContext'
import { SerialConnection } from '../SerialConnection'

export interface DmxUsbDeviceConfig {
  sendUniverse: (
    universe: number[],
    connection: SerialConnection
  ) => Promise<void>
  refreshHz: (c: EngineContext) => number
  name: string
}
