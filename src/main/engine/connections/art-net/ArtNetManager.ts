import dgram from 'node:dgram'
import { artDmxBuffer } from './artNetBuffers'
import { toIpBuffer } from '../ipUtil'
import * as constants from './constants'
import { ArtNetConnectionInfo } from 'shared/connection'
import { EngineContext } from 'main/engine/engineContext'

export class ArtNetManager {
  private client: dgram.Socket
  private intervalHandle: NodeJS.Timeout

  constructor(c: EngineContext) {
    this.client = dgram.createSocket('udp4')

    this.intervalHandle = setInterval(() => {
      const controlState = c.controlState()
      if (!controlState) {
        return
      }

      const routingTable =
        controlState.control.device.connectionSettings.artNetIpByUniverse ?? {}
      const fallbackIp = controlState.control.device.connectable.artNet[0]?.trim()

      const dmxOutByUniverse = c.realtimeState().dmxOutByUniverse
      const universes =
        dmxOutByUniverse.length > 0
          ? dmxOutByUniverse
          : [c.realtimeState().dmxOut]

      universes.forEach((universe, universeIndex) => {
        const universeNumber = universeIndex + 1
        const routeIp = routingTable[universeNumber]
        const targetIp = (routeIp ?? fallbackIp ?? '').trim()
        if (targetIp.length === 0 || !toIpBuffer(targetIp)) {
          return
        }

        const buffer = artDmxBuffer(universe, universeIndex)

        this.client.send(buffer, constants.ARTNET_PORT, targetIp, (err, _bytes) => {
          if (err) {
            console.error(`ArtNet UDP Error: ${err}`)
            this.client.close()
            this.client = dgram.createSocket('udp4')
          }
        })
      })
    }, constants.DMX_PERIOD_MS)
  }

  updateConnections(): ArtNetConnectionInfo {
    return {}
  }

  destroy() {
    clearInterval(this.intervalHandle)
  }
}
