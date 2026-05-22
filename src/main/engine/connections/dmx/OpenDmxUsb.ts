import { EngineContext } from 'main/engine/engineContext'
import { DmxUsbDeviceConfig } from './DmxUsbDeviceConfig'
import { DMX_MAX_VALUE, DMX_MIN_VALUE, DMX_NUM_CHANNELS } from 'shared/dmxFixtures'

const cfg: DmxUsbDeviceConfig = {
  refreshHz: (c: EngineContext) => {
    return (
      c.controlState()?.control.device.connectionSettings
        .openDmxRefreshRateHz ?? 30
    )
  },
  sendUniverse: async (universe, connection) => {
    const universeBuffer = Buffer.alloc(513, 0)

    for (let index = 0; index < DMX_NUM_CHANNELS; index++) {
      const raw = universe[index]
      const value = Number.isFinite(raw)
        ? Math.max(DMX_MIN_VALUE, Math.min(DMX_MAX_VALUE, Math.round(raw)))
        : 0
      universeBuffer[index + 1] = value
    }

    let buffer = universeBuffer

    await connection.set({ brk: true, rts: false }, 1)
    await connection.set({ brk: false, rts: false }, 1)
    connection.write(buffer)
  },
  name: 'Open Dmx Usb',
}

export default cfg
