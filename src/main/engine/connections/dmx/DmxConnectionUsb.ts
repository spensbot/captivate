import { DmxDeviceUsb_t, DmxUsbDeviceType } from 'shared/connection'
import { SerialConnection } from '../SerialConnection'
import DmxUsbPro, { isDmxUsbPro } from './DmxUsbPro'
import OpenDmxUsb from './OpenDmxUsb'
import { EngineContext } from 'main/engine/engineContext'

export interface DmxUsbDeviceConfig {
  sendUniverse: (
    universe: number[],
    connection: SerialConnection
  ) => Promise<void>
  refreshHz: (c: EngineContext) => number
  name: string
}

const configByDeviceType: { [key in DmxUsbDeviceType]: DmxUsbDeviceConfig } = {
  DmxUsbPro,
  OpenDmxUsb,
}

export class DmxConnectionUsb {
  type = 'DmxConnectionUsb'
  device: DmxDeviceUsb_t
  private serialConnection: SerialConnection
  private intervalHandle: NodeJS.Timer
  private config: DmxUsbDeviceConfig
  private c: EngineContext
  private lastHz: number = 0

  private constructor(
    device: DmxDeviceUsb_t,
    serialConnection: SerialConnection,
    c: EngineContext
  ) {
    this.c = c
    this.device = device
    this.serialConnection = serialConnection
    this.config = configByDeviceType[device.type as DmxUsbDeviceType]
    this.lastHz = this.config.refreshHz(this.c)
    this.device.name = this.config.name
    this.intervalHandle = setInterval(() => {
      this.sendDmx()
    }, 1000 / this.config.refreshHz(c))
  }

  static async create(
    device: DmxDeviceUsb_t,
    c: EngineContext
  ): Promise<DmxConnectionUsb> {
    let serialConnection = await SerialConnection.connect(device.path)

    let isPro = await isDmxUsbPro(serialConnection)

    device.type = isPro ? 'DmxUsbPro' : 'OpenDmxUsb'

    return new DmxConnectionUsb(device, serialConnection, c)
  }

  beginInterval() {
    this.intervalHandle = setInterval(() => {
      this.sendDmx()
      const hz = this.config.refreshHz(this.c)
      if (this.lastHz !== hz) {
        this.lastHz = hz
        clearInterval(this.intervalHandle)
        this.beginInterval()
      }
    }, 1000 / this.config.refreshHz(this.c))
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
      this.c.realtimeState().dmxOut,
      this.serialConnection
    )
  }
}
