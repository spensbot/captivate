import dgram from 'node:dgram'
import { artDmxBuffer } from './artNetBuffers'
import { RealtimeState } from 'renderer/redux/realtimeStore'

const DMX_PERIOD_MS = 1000 / 44
const ARTNET_PORT = 0x1936
const LOCALHOST_IP = '127.0.0.1'
// const POLL_FREQUENCY = 1 / 2.7 // .Art-Net requires that all controllers broadcast an ArtPoll every 2.5 to 3 seconds
// const PRIMARY_ARTNET_IP = '2.255.255.255'
// const SECONDARY_ARTNET_IP = '10.255.255.255'

export class ArtNetManager {
  client: dgram.Socket
  intervalHandle: NodeJS.Timer

  constructor(getRealtimeState: () => RealtimeState) {
    this.client = dgram.createSocket('udp4')

    this.intervalHandle = setInterval(() => {
      const universe = getRealtimeState().dmxOut
      const buffer = artDmxBuffer(universe, 0)
      this.client.send(buffer, ARTNET_PORT, LOCALHOST_IP, (err, _bytes) => {
        if (err) {
          console.error(`ArtNet UDP Error: ${err}`)
          this.client.close()
          this.client = dgram.createSocket('udp4')
        }
      })
    }, DMX_PERIOD_MS)
  }
}
