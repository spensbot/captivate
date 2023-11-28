import dgram from 'node:dgram'
import { artDmxBuffer } from './artNetBuffers'
import { RealtimeState } from 'renderer/redux/realtimeStore'
import * as c from './constants'
import { CleanReduxState } from 'renderer/redux/store'
import { toIpBuffer } from '../ipUtil'
import { ArtNetConnectionInfo } from 'shared/connection'

export class ArtNetManager {
  private client: dgram.Socket
  private intervalHandle: NodeJS.Timer

  constructor(
    getRealtimeState: () => RealtimeState,
    getControlState: () => CleanReduxState | null
  ) {
    this.client = dgram.createSocket('udp4')

    this.intervalHandle = setInterval(() => {
      const universe = getRealtimeState().dmxOut
      const buffer = artDmxBuffer(universe, 0)
      const controlState = getControlState()
      const artNetIpOut: string | undefined = controlState
        ? controlState.control.device.connectable.artNet[0]
        : undefined
      if (artNetIpOut && toIpBuffer(artNetIpOut)) {
        this.client.send(buffer, c.ARTNET_PORT, artNetIpOut, (err, _bytes) => {
          if (err) {
            console.error(`ArtNet UDP Error: ${err}`)
            this.client.close()
            this.client = dgram.createSocket('udp4')
          }
        })
      }
    }, c.DMX_PERIOD_MS)
  }

  updateConnections(): ArtNetConnectionInfo {
    return {}
  }

  destroy() {
    clearInterval(this.intervalHandle)
  }
}
