/**
 * Ether Dream DAC — TCP control stream (port 7765).
 * Protocol: https://ether-dream.com/protocol.html
 */
import net from 'net'
import type { LaserDacFramePoint } from '../../../shared/laserDac'
import type { LaserTransport } from './laserTransportTypes'

const DEFAULT_PORT = 7765
const DAC_RESPONSE_BYTES = 24
const DAC_POINT_BYTES = 18

function parseHostPort(
  target: string,
  defaultPort: number
): { host: string; port: number } {
  const t = target.trim()
  if (t.length === 0 || /^auto/i.test(t)) {
    throw new Error('Ether Dream needs a host or IP (set Target, e.g. 192.168.1.50).')
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

function normToInt16X(x01: number): number {
  const x = Math.max(0, Math.min(1, x01))
  return Math.round(x * 65535 - 32768)
}

function normToInt16Y(y01: number): number {
  const y = Math.max(0, Math.min(1, 1 - y01))
  return Math.round(y * 65535 - 32768)
}

function writeDacPoint(
  buf: Buffer,
  off: number,
  p: LaserDacFramePoint,
  control: number
): number {
  let c = control
  const x = normToInt16X(p.x)
  const y = normToInt16Y(p.y)
  let r = Math.round(Math.max(0, Math.min(1, p.r)) * 65535)
  let g = Math.round(Math.max(0, Math.min(1, p.g)) * 65535)
  let b = Math.round(Math.max(0, Math.min(1, p.b)) * 65535)
  let i = 65535
  if (p.blank) {
    r = 0
    g = 0
    b = 0
    i = 0
  }
  buf.writeUInt16LE(c & 0xffff, off)
  buf.writeInt16LE(x, off + 2)
  buf.writeInt16LE(y, off + 4)
  buf.writeUInt16LE(r, off + 6)
  buf.writeUInt16LE(g, off + 8)
  buf.writeUInt16LE(b, off + 10)
  buf.writeUInt16LE(i, off + 12)
  buf.writeUInt16LE(0, off + 14)
  buf.writeUInt16LE(0, off + 16)
  return off + DAC_POINT_BYTES
}

export class EtherDreamTcpTransport implements LaserTransport {
  private readonly host: string
  private readonly port: number
  private sock: net.Socket | null = null
  private rx = Buffer.alloc(0)
  private prepared = false
  private beginSent = false
  private lastPps = 0

  constructor(target: string) {
    const hp = parseHostPort(target, DEFAULT_PORT)
    this.host = hp.host
    this.port = hp.port
  }

  private attachSocket(s: net.Socket) {
    s.setNoDelay(true)
    s.on('data', (chunk: Buffer) => {
      this.rx = Buffer.concat([this.rx, chunk])
    })
  }

  private shiftResponse(): Buffer | null {
    if (this.rx.length < DAC_RESPONSE_BYTES) return null
    const r = this.rx.subarray(0, DAC_RESPONSE_BYTES)
    this.rx = this.rx.subarray(DAC_RESPONSE_BYTES)
    return r
  }

  /** Wait until at least one full response is available (with timeout). */
  private async waitResponse(timeoutMs: number): Promise<Buffer> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const r = this.shiftResponse()
      if (r) return r
      await new Promise((r) => setTimeout(r, 2))
    }
    throw new Error('Ether Dream response timeout.')
  }

  private expectAck(resp: Buffer, cmd: number) {
    const code = resp[0]
    const echoed = resp[1]
    if (echoed !== cmd) {
      throw new Error(`Ether Dream protocol mismatch (expected cmd ${cmd}, got ${echoed}).`)
    }
    if (code !== 0x61) {
      const name =
        code === 0x46 ? 'NAK Full' : code === 0x49 ? 'NAK Invalid' : `code 0x${code.toString(16)}`
      throw new Error(`Ether Dream ${name}`)
    }
  }

  async connect(): Promise<void> {
    await this.disconnect()
    const sock = new net.Socket()
    this.sock = sock
    this.rx = Buffer.alloc(0)
    this.prepared = false
    this.beginSent = false
    this.lastPps = 0

    await new Promise<void>((resolve, reject) => {
      sock.once('error', reject)
      sock.connect(this.port, this.host, () => {
        sock.off('error', reject)
        resolve()
      })
    })

    this.attachSocket(sock)
    // Initial status from DAC (same as ping reply).
    await this.waitResponse(3000)
  }

  async disconnect(): Promise<void> {
    const s = this.sock
    this.sock = null
    if (!s || s.destroyed) return
    try {
      const stop = Buffer.from('s')
      s.write(stop)
    } catch {
      /* ignore */
    }
    await new Promise<void>((resolve) => {
      s.end(() => resolve())
      s.once('close', () => resolve())
      setTimeout(resolve, 200)
    })
  }

  async pushFrame(points: LaserDacFramePoint[], pointRatePps: number): Promise<void> {
    const sock = this.sock
    if (!sock || sock.destroyed) throw new Error('Ether Dream not connected.')

    if (points.length < 2) return

    if (!this.prepared) {
      sock.write(Buffer.from('p'))
      const prep = await this.waitResponse(2000)
      this.expectAck(prep, 0x70)
      this.prepared = true
    }

    const pps = Math.max(1000, Math.min(100000, Math.round(pointRatePps)))
    let num = points.length
    if (((num - 45) % 64) === 0) num -= 1

    const chunkSize = 400
    let offset = 0

    while (offset < num) {
      const n = Math.min(chunkSize, num - offset)
      const payload = Buffer.alloc(3 + n * DAC_POINT_BYTES)
      payload.writeUInt8(0x64, 0)
      payload.writeUInt16LE(n, 1)
      let po = 3
      for (let i = 0; i < n; i++) {
        const p = points[offset + i]!
        po = writeDacPoint(payload, po, p, 0)
      }

      let tries = 0
      while (tries < 80) {
        sock.write(payload)
        const wr = await this.waitResponse(2000)
        if (wr[0] === 0x46) {
          tries++
          await new Promise((r) => setTimeout(r, 3))
          continue
        }
        this.expectAck(wr, 0x64)
        break
      }
      offset += n
    }

    if (!this.beginSent) {
      const begin = Buffer.alloc(8)
      begin.writeUInt8(0x62, 0)
      begin.writeUInt16LE(0, 1)
      begin.writeUInt32LE(pps, 3)
      sock.write(begin)
      const br = await this.waitResponse(2000)
      this.expectAck(br, 0x62)
      this.beginSent = true
      this.lastPps = pps
    } else if (pps !== this.lastPps) {
      const q = Buffer.alloc(5)
      q.writeUInt8(0x74, 0)
      q.writeUInt32LE(pps, 1)
      sock.write(q)
      const qr = await this.waitResponse(2000)
      this.expectAck(qr, 0x74)
      this.lastPps = pps
    }
  }
}