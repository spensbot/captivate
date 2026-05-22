/**
 * UDP dev bridge for lab tools / custom receivers (not a formal ILDA or IDN-Stream spec).
 * Payload is documented in-code for interoperability.
 */
import dgram from 'dgram'
import type { LaserDacFramePoint } from '../../../shared/laserDac'
import type { LaserOutputProtocol } from '../../../shared/laserDac'
import type { LaserTransport } from './laserTransportTypes'

const MAGIC = Buffer.from('CAP1', 'ascii')

function parseHostPort(
  target: string,
  defaultPort: number
): { host: string; port: number } {
  const t = target.trim()
  if (t.length === 0 || /^auto/i.test(t)) {
    throw new Error('Generic / UDP bridge needs a host (set Target, e.g. 127.0.0.1:40200).')
  }
  const colon = t.lastIndexOf(':')
  if (colon > 0 && colon < t.length - 1) {
    const host = t.slice(0, colon).replace(/^\[|\]$/g, '')
    const port = Number(t.slice(colon + 1))
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      throw new Error('Invalid port in Target.')
    }
    return { host, port }
  }
  return { host: t, port: defaultPort }
}

function normToI16(v01: number, flipY: boolean): number {
  const v = flipY ? 1 - v01 : v01
  const c = Math.max(0, Math.min(1, v))
  return Math.round(c * 65535 - 32768)
}

export class UdpLaserBridgeTransport implements LaserTransport {
  private readonly host: string
  private readonly port: number
  private readonly proto: LaserOutputProtocol
  private sock: dgram.Socket | null = null

  constructor(target: string, protocol: LaserOutputProtocol, defaultPort: number) {
    const hp = parseHostPort(target, defaultPort)
    this.host = hp.host
    this.port = hp.port
    this.proto = protocol
  }

  async connect(): Promise<void> {
    await this.disconnect()
    const s = dgram.createSocket('udp4')
    this.sock = s
    await new Promise<void>((resolve, reject) => {
      s.once('error', reject)
      s.connect(this.port, this.host, () => {
        s.off('error', reject)
        resolve()
      })
    })
  }

  async disconnect(): Promise<void> {
    const s = this.sock
    this.sock = null
    if (s) {
      try {
        s.close()
      } catch {
        /* ignore */
      }
    }
  }

  async pushFrame(points: LaserDacFramePoint[], pointRatePps: number): Promise<void> {
    const s = this.sock
    if (!s) throw new Error('UDP laser bridge not connected.')
    const n = Math.min(8000, points.length)
    const pps = Math.max(1000, Math.min(200000, Math.round(pointRatePps)))
    const header = Buffer.alloc(16)
    MAGIC.copy(header, 0)
    header.writeUInt8(this.proto === 'idn' ? 2 : 1, 4)
    header.writeUInt8(0, 5)
    header.writeUInt16LE(n, 6)
    header.writeUInt32LE(pps, 8)
    header.writeUInt32LE(0, 12)

    const body = Buffer.alloc(n * 11)
    for (let i = 0; i < n; i++) {
      const p = points[i]!
      const o = i * 11
      body.writeInt16LE(normToI16(p.x, false), o)
      body.writeInt16LE(normToI16(p.y, true), o + 2)
      body.writeUInt8(p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.r)) * 255), o + 4)
      body.writeUInt8(p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.g)) * 255), o + 5)
      body.writeUInt8(p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.b)) * 255), o + 6)
      body.writeUInt8(p.blank ? 1 : 0, o + 7)
      body.writeUInt8(0, o + 8)
      body.writeUInt8(0, o + 9)
      body.writeUInt8(0, o + 10)
    }
    const pkt = Buffer.concat([header, body])
    await new Promise<void>((resolve, reject) => {
      s.send(pkt, (err) => (err ? reject(err) : resolve()))
    })
  }
}
