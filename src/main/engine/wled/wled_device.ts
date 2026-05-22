import dgram from 'node:dgram'
import http from 'node:http'
import makeMdns from 'multicast-dns'
import { buildWledUdpPackets, WledPixelTransportFormat } from './udp_buffer'
import { BaseColors } from '../../../shared/baseColors'
import { telemetryCounter, telemetryHealth } from '../../telemetry'

const mdns = makeMdns()
const client = dgram.createSocket('udp4')

const WLED_PORT = 21324
const MDNS_QUERY_TYPE = 'A'
const HTTP_TIMEOUT_MS = 1600

mdns.on('error', (e) => {
  console.error('error', e)
  telemetryCounter('wled.discovery', 'mdns_errors')
  telemetryHealth('wled.discovery', 'warn', 'mDNS error', {
    message: e instanceof Error ? e.message : String(e),
  })
})

mdns.on('warning', (w) => {
  console.warn('warning', w)
  telemetryCounter('wled.discovery', 'mdns_warnings')
})

function isIpv4(value: string) {
  const input = value.trim()
  const parts = input.split('.')
  if (parts.length !== 4) return false
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false
    const numeric = Number(part)
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 255) {
      return false
    }
  }
  return true
}

export default class WledDevice {
  readonly target: string
  private mdns_name: string | null = null
  private listener
  private ip: string | null = null

  constructor(target: string) {
    this.target = target.trim()

    this.listener = (res: makeMdns.ResponsePacket) => {
      if (this.mdns_name === null) {
        return
      }
      const answers = Array.isArray(res.answers) ? res.answers : []
      const additionals = Array.isArray(res.additionals) ? res.additionals : []
      const records = [...answers, ...additionals]
      for (const answer of records) {
        if (answer.type === MDNS_QUERY_TYPE && answer.name === this.mdns_name) {
          const nextIp = String(answer.data ?? '').trim()
          if (nextIp.length <= 0) {
            continue
          }
          if (this.ip !== nextIp) {
            this.ip = nextIp
            console.log(`WLED ip updated ${this.mdns_name} -> ${this.ip}`)
            telemetryCounter('wled.device', 'ip_updates')
          }
        }
      }
    }

    if (isIpv4(this.target)) {
      this.ip = this.target
      telemetryCounter('wled.device', 'direct_ip_targets')
      return
    }

    this.mdns_name = this.target.endsWith('.local')
      ? this.target
      : `${this.target}.local`
    mdns.addListener('response', this.listener)
    this.refresh()
  }

  refresh() {
    if (this.mdns_name !== null) {
      mdns.query(this.mdns_name, MDNS_QUERY_TYPE)
    }
  }

  broadcast(
    colors: BaseColors[],
    startIndex = 0,
    format: WledPixelTransportFormat = 'auto'
  ) {
    const destination = this.getUdpDestination()
    if (destination === null) {
      return
    }

    try {
      const packets = buildWledUdpPackets(colors, startIndex, format)
      for (const packet of packets) {
        client.send(packet, WLED_PORT, destination, (err) => {
          if (err) {
            console.error('UDP Send Error\n', err)
            telemetryCounter('wled.device', 'udp_send_errors')
            telemetryHealth('wled.device', 'warn', 'UDP send callback error', {
              message: err.message,
            })
          }
        })
      }
    } catch (err) {
      console.error('UDP Send Error 2\n', err)
      telemetryCounter('wled.device', 'udp_send_errors')
      telemetryHealth('wled.device', 'warn', 'UDP send exception', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async enableLiveOverride(): Promise<void> {
    await this.postJson('/json/state', { on: true, lor: 1 })
  }

  async setPwmColor(
    segmentId: number | null,
    color: { red: number; green: number; blue: number; white: number }
  ): Promise<void> {
    const host = this.getHttpHost()
    if (host === null) {
      return
    }

    const payload =
      segmentId === null
        ? {
            on: true,
            seg: [{ col: [[color.red, color.green, color.blue, color.white]] }],
          }
        : {
            on: true,
            seg: [
              {
                id: segmentId,
                col: [[color.red, color.green, color.blue, color.white]],
              },
            ],
          }

    await this.postJson('/json/state', payload)
  }

  private getUdpDestination(): string | null {
    if (this.ip !== null && this.ip.trim().length > 0) {
      return this.ip.trim()
    }
    if (this.mdns_name !== null && this.mdns_name.trim().length > 0) {
      return this.mdns_name.trim()
    }
    if (this.target.length > 0) {
      return this.target
    }
    return null
  }

  private getHttpHost(): string | null {
    const destination = this.getUdpDestination()
    if (destination === null) {
      return null
    }
    return destination.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  }

  private async postJson(path: string, payload: unknown): Promise<void> {
    const host = this.getHttpHost()
    if (host === null) {
      return
    }
    const body = Buffer.from(JSON.stringify(payload))
    await new Promise<void>((resolve) => {
      const request = http.request(
        {
          hostname: host,
          port: 80,
          path,
          method: 'POST',
          timeout: HTTP_TIMEOUT_MS,
          headers: {
            'content-type': 'application/json',
            'content-length': body.length,
          },
        },
        (res) => {
          if ((res.statusCode ?? 500) >= 400) {
            telemetryCounter('wled.device', 'http_send_errors')
            telemetryHealth('wled.device', 'warn', 'WLED HTTP POST failed', {
              statusCode: res.statusCode,
            })
          }
          res.resume()
          resolve()
        }
      )
      request.on('error', (error) => {
        telemetryCounter('wled.device', 'http_send_errors')
        telemetryHealth('wled.device', 'warn', 'WLED HTTP POST error', {
          message: error.message,
        })
        resolve()
      })
      request.on('timeout', () => {
        request.destroy()
        telemetryCounter('wled.device', 'http_send_errors')
        telemetryHealth('wled.device', 'warn', 'WLED HTTP POST timeout')
        resolve()
      })
      request.write(body)
      request.end()
    })
  }

  release() {
    if (this.mdns_name !== null) {
      mdns.removeListener('response', this.listener)
    }
  }
}
