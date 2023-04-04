import dgram from 'node:dgram'
import makeMdns from 'multicast-dns'
import udpBuffer from './udp_buffer'
import { BaseColors } from '../../utils/baseColors'

const mdns = makeMdns()
const client = dgram.createSocket('udp4')

const WLED_PORT = 21324
const MDNS_QUERY_TYPE = 'A'

mdns.on('error', (e) => {
  console.error('error', e)
})

mdns.on('warning', (w) => {
  console.warn('warning', w)
})

export default class WledDevice {
  mdns_name
  listener
  ip: string | null = null

  constructor(mdns_name: string) {
    this.mdns_name = `${mdns_name}.local`

    this.listener = (res: makeMdns.ResponsePacket) => {
      if (res.answers.length > 0) {
        let answer = res.answers[0]
        if (answer.type === MDNS_QUERY_TYPE && answer.name === this.mdns_name) {
          if (this.ip !== answer.data) {
            this.ip = answer.data
            console.log(`WLed ip updated ${this.mdns_name} -> ${this.ip}`)
          }
        }
      }
    }

    mdns.addListener('response', this.listener)

    this.refresh()
  }

  /// Re-queries mdns to update the device ip address
  refresh() {
    mdns.query(this.mdns_name, MDNS_QUERY_TYPE)
  }

  /// Sends colors to each led via UDP
  broadcast(colors: BaseColors[]) {
    if (this.ip !== null) {
      try {
        client.send(udpBuffer(colors), WLED_PORT, this.ip, (err) => {
          if (err) {
            console.error('UDP Send Error\n', err)
          }
        })
      } catch (err) {
        console.error('UDP Send Error 2\n', err)
      }
    }
  }

  release() {
    mdns.removeListener('response', this.listener)
  }
}
