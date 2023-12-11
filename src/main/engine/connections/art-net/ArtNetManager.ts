import dgram from 'node:dgram'
import { artDmxBuffer } from './artNetBuffers'
import { toIpBuffer } from '../ipUtil'
import * as constants from './constants'
import { ArtNetConnectionInfo } from 'shared/connection'
import { EngineContext } from 'main/engine/engineContext'

export class ArtNetManager {
  private client: dgram.Socket
  private intervalHandle: NodeJS.Timer

  constructor(c: EngineContext) {
    this.client = dgram.createSocket('udp4')

    this.intervalHandle = setInterval(() => {
      const universe = c.realtimeState().dmxOut
      const buffer = artDmxBuffer(universe, 0)
      const controlState = c.controlState()
      const artNetIpOut: string | undefined = controlState
        ? controlState.control.device.connectable.artNet[0]
        : undefined
      if (artNetIpOut && toIpBuffer(artNetIpOut)) {
        this.client.send(
          buffer,
          constants.ARTNET_PORT,
          artNetIpOut,
          (err, _bytes) => {
            if (err) {
              console.error(`ArtNet UDP Error: ${err}`)
              this.client.close()
              this.client = dgram.createSocket('udp4')
            }
          }
        )
      }
    }, constants.DMX_PERIOD_MS)
  }

  updateConnections(): ArtNetConnectionInfo {
    return {}
  }

  destroy() {
    clearInterval(this.intervalHandle)
  }
}
