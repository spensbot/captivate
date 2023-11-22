import { DmxDeviceUsb_t } from 'shared/connection'
import { SerialConnection } from '../SerialConnection'
import * as DmxUsbPro from './DmxUsbPro'
import * as OpenDmxUsb from './OpenDmxUsb'

const DMX_SEND_INTERVAL = 1000 / 30
// const DMX_SEND_INTERVAL = 46

const sendByDeviceType: {
  [key in DmxDeviceUsb_t['type']]: (
    universe: number[],
    connection: SerialConnection
  ) => Promise<void>
} = {
  DmxUsbPro: DmxUsbPro.sendUniverse,
  OpenDmxUsb: OpenDmxUsb.sendUniverse,
}

export class DmxConnectionUsb {
  type = 'DmxConnectionUsb'
  device: DmxDeviceUsb_t
  universe: number[] = []
  private serialConnection: SerialConnection
  private intervalHandle: NodeJS.Timer

  private constructor(
    device: DmxDeviceUsb_t,
    serialConnection: SerialConnection
  ) {
    this.device = device
    this.serialConnection = serialConnection
    this.intervalHandle = setInterval(() => {
      this.sendDmx()
    }, DMX_SEND_INTERVAL)
  }

  static async create(device: DmxDeviceUsb_t): Promise<DmxConnectionUsb> {
    let serialConnection = await SerialConnection.connect(device.path)
    return new DmxConnectionUsb(device, serialConnection)
  }

  isOpen(): boolean {
    return this.serialConnection.isOpen()
  }

  disconnect() {
    clearInterval(this.intervalHandle)
    this.serialConnection.disconnect()
  }

  private sendDmx() {
    const send = sendByDeviceType[this.device.type]
    send(this.universe, this.serialConnection)
  }
}
