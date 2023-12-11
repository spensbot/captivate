import { EngineContext } from 'main/engine/engineContext'
import { DmxUsbDeviceConfig } from './DmxConnectionUsb'

const cfg: DmxUsbDeviceConfig = {
  refreshHz: (c: EngineContext) => {
    return (
      c.controlState()?.control.device.connectionSettings
        .openDmxRefreshRateHz ?? 30
    )
  },
  sendUniverse: async (universe, connection) => {
    const universeBuffer = Buffer.alloc(513, 0)

    universe.forEach((value, index) => (universeBuffer[index + 1] = value))

    let buffer = universeBuffer

    await connection.set({ brk: true, rts: false }, 1)
    await connection.set({ brk: false, rts: false }, 1)
    connection.write(buffer)
  },
  name: 'Open Dmx Usb',
}

export default cfg
