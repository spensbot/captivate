import dgram from 'node:dgram'
import {
  createArtDmxPacketBuffer,
  writeArtDmxPacket,
} from './artNetBuffers'
import { toIpBuffer } from '../ipUtil'
import * as constants from './constants'
import { ArtNetConnectionInfo } from 'shared/connection'
import { EngineContext } from 'main/engine/engineContext'

export class ArtNetManager {
  private client: dgram.Socket
  private intervalHandle: NodeJS.Timeout
  private destroyed = false
  private sequence = 1
  private packetByUniverseIndex = new Map<number, Buffer>()

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

      const sequence = this.sequence
      this.sequence = sequence >= 255 ? 1 : sequence + 1

      universes.forEach((universe, universeIndex) => {
        const universeNumber = universeIndex + 1
        const routeIp = routingTable[universeNumber]
        const targetIp = (routeIp ?? fallbackIp ?? '').trim()
        if (targetIp.length === 0 || !toIpBuffer(targetIp)) {
          return
        }

        let packet = this.packetByUniverseIndex.get(universeIndex)
        if (packet === undefined) {
          packet = createArtDmxPacketBuffer(universeIndex)
          this.packetByUniverseIndex.set(universeIndex, packet)
        }
        writeArtDmxPacket(packet, universe, sequence)

        this.client.send(packet, constants.ARTNET_PORT, targetIp, (err) => {
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
    if (this.destroyed) return
    this.destroyed = true
    clearInterval(this.intervalHandle)
    this.packetByUniverseIndex.clear()
    try {
      this.client.close()
    } catch {
      /* ignore */
    }
  }
}
