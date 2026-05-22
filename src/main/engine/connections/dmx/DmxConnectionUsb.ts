import { DmxDeviceUsb_t, DmxUsbDeviceType } from 'shared/connection'
import { SerialConnection } from '../SerialConnection'
import DmxUsbPro, { isDmxUsbPro } from './DmxUsbPro'
import OpenDmxUsb from './OpenDmxUsb'
import { EngineContext } from 'main/engine/engineContext'
import { DmxUsbDeviceConfig } from './DmxUsbDeviceConfig'

const configByDeviceType: { [key in DmxUsbDeviceType]: DmxUsbDeviceConfig } = {
  DmxUsbPro,
  OpenDmxUsb,
}

export class DmxConnectionUsb {
  type = 'DmxConnectionUsb'
  device: DmxDeviceUsb_t
  private serialConnection: SerialConnection
  private intervalHandle: NodeJS.Timeout
  private config: DmxUsbDeviceConfig
  private c: EngineContext
  private lastHz: number = 0
  /** Whether this connection was opened with "force USB Pro / widget protocol" from settings. */
  private readonly forcedWidgetProtocol: boolean

  private constructor(
    device: DmxDeviceUsb_t,
    serialConnection: SerialConnection,
    c: EngineContext,
    forcedWidgetProtocol: boolean
  ) {
    this.c = c
    this.device = device
    this.serialConnection = serialConnection
    this.forcedWidgetProtocol = forcedWidgetProtocol
    this.config = configByDeviceType[device.type as DmxUsbDeviceType]
    this.lastHz = this.config.refreshHz(this.c)
    this.device.name = this.config.name
    this.intervalHandle = this.beginInterval()
  }

  static async create(
    device: DmxDeviceUsb_t,
    c: EngineContext
  ): Promise<DmxConnectionUsb> {
    const serialConnection = await SerialConnection.connect(device.path)

    const settings = c.controlState()?.control.device.connectionSettings
    const forceWidget =
      settings?.dmxUsbUseWidgetProtocolByDevice?.[device.connectionId] === true

    const isPro = forceWidget || (await isDmxUsbPro(serialConnection))

    device.type = isPro ? 'DmxUsbPro' : 'OpenDmxUsb'

    return new DmxConnectionUsb(device, serialConnection, c, forceWidget)
  }

  usesForcedWidgetProtocol(): boolean {
    return this.forcedWidgetProtocol
  }

  beginInterval(): NodeJS.Timeout {
    return setInterval(() => {
      this.sendDmx()
      const hz = this.config.refreshHz(this.c)
      if (this.lastHz !== hz) {
        this.lastHz = hz
        clearInterval(this.intervalHandle)
        this.intervalHandle = this.beginInterval()
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

  private getAssignedUniverse(): number {
    const controlState = this.c.controlState()
    if (controlState === null) {
      return 1
    }

    const universeCount =
      controlState.control.device.connectionSettings.universeCount ?? 1
    const assignedUniverse =
      controlState.control.device.connectionSettings.dmxUniverseByDevice?.[
        this.device.connectionId
      ] ?? 1

    if (!Number.isFinite(assignedUniverse)) return 1
    return Math.min(Math.max(1, Math.round(assignedUniverse)), universeCount)
  }

  private sendDmx() {
    const realtimeState = this.c.realtimeState()
    const universeIndex = this.getAssignedUniverse() - 1
    const universe =
      realtimeState.dmxOutByUniverse[universeIndex] ?? realtimeState.dmxOut

    this.config.sendUniverse(universe, this.serialConnection)
  }
}
