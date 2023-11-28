import { DmxDeviceUsb_t, DmxDevice_t } from 'shared/connection'
import { SerialConnection } from '../SerialConnection'
import DmxUsbPro from './DmxUsbPro'
import OpenDmxUsb from './OpenDmxUsb'
import { RealtimeState } from 'renderer/redux/realtimeStore'

export interface DmxUsbDeviceConfig {
  sendUniverse: (
    universe: number[],
    connection: SerialConnection
  ) => Promise<void>
  refreshHz: number
}

const configByDeviceType: { [key in DmxDevice_t['type']]: DmxUsbDeviceConfig } =
  {
    DmxUsbPro,
    OpenDmxUsb,
  }

export class DmxConnectionUsb {
  type = 'DmxConnectionUsb'
  device: DmxDeviceUsb_t
  private serialConnection: SerialConnection
  private intervalHandle: NodeJS.Timer
  private config: DmxUsbDeviceConfig
  private getRealtimeState: () => RealtimeState

  private constructor(
    device: DmxDeviceUsb_t,
    serialConnection: SerialConnection,
    getRealtimeState: () => RealtimeState
  ) {
    this.device = device
    this.serialConnection = serialConnection
    this.config = configByDeviceType[this.device.type]
    this.intervalHandle = setInterval(() => {
      this.sendDmx()
    }, 1000 / this.config.refreshHz)
    this.getRealtimeState = getRealtimeState
  }

  static async create(
    device: DmxDeviceUsb_t,
    getRealtimeState: () => RealtimeState
  ): Promise<DmxConnectionUsb> {
    let serialConnection = await SerialConnection.connect(device.path)
    return new DmxConnectionUsb(device, serialConnection, getRealtimeState)
  }

  isOpen(): boolean {
    return this.serialConnection.isOpen()
  }

  disconnect() {
    clearInterval(this.intervalHandle)
    this.serialConnection.disconnect()
  }

  private sendDmx() {
    this.config.sendUniverse(
      this.getRealtimeState().dmxOut,
      this.serialConnection
    )
  }
}
