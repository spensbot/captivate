/**
 * Helios USB DAC (Grix / Helios) — ILDA path via libusb-compatible `usb` package.
 * VID/PID and framing from official SDK (MIT).
 */
import type { LaserDacFramePoint } from '../../../shared/laserDac'
import type { LaserTransport } from './laserTransportTypes'

const HELIOS_VID = 0x1209
const HELIOS_PID = 0xe500
const EP_INT_OUT = 0x06
const EP_INT_IN = 0x83
const EP_BULK_OUT = 0x02
const HELIOS_SDK_VERSION = 11
/** HELIOS_FLAGS_SINGLE_MODE */
const HELIOS_FLAGS = 1 << 1

function getUsbModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('usb')
  } catch {
    return null
  }
}

function parseDeviceIndex(target: string): number {
  const t = target.trim()
  if (t.length === 0 || /^auto/i.test(t)) return 0
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function toHelios12(x01: number): number {
  const x = Math.max(0, Math.min(1, x01))
  return Math.round(x * 0xfff) << 4
}

function toHelios12Y(y01: number): number {
  return toHelios12(1 - y01)
}

function interruptTransfer(
  ep: { transfer: (buf: Buffer, cb: (e?: Error) => void) => void },
  buf: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    ep.transfer(buf, (e?: Error) => (e ? reject(e) : resolve()))
  })
}

function interruptTransferIn(
  ep: { transfer: (n: number, cb: (e?: Error, data?: Buffer) => void) => void },
  size: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ep.transfer(size, (e?: Error, data?: Buffer) => {
      if (e) reject(e)
      else resolve(data ?? Buffer.alloc(0))
    })
  })
}

function bulkTransfer(
  ep: { transfer: (buf: Buffer, cb: (e?: Error) => void) => void },
  buf: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    ep.transfer(buf, (e?: Error) => (e ? reject(e) : resolve()))
  })
}

export class HeliosUsbTransport implements LaserTransport {
  private readonly deviceIndex: number
  private device: any = null
  private iface: any = null
  private bulkOut: any = null
  private intOut: any = null
  private intIn: any = null
  private shutterOpen = false

  constructor(target: string) {
    this.deviceIndex = parseDeviceIndex(target)
  }

  async connect(): Promise<void> {
    await this.disconnect()
    const usb = getUsbModule()
    if (!usb) {
      throw new Error(
        'Native `usb` module not available. Run `npm install` in release/app after adding the dependency, then rebuild.'
      )
    }

    const list = usb
      .getDeviceList()
      .filter(
        (d: any) =>
          d.deviceDescriptor?.idVendor === HELIOS_VID &&
          d.deviceDescriptor?.idProduct === HELIOS_PID
      )
    if (list.length === 0) {
      throw new Error('No Helios USB DAC found (VID 1209 / PID E500).')
    }
    if (this.deviceIndex >= list.length) {
      throw new Error(
        `Helios device index ${this.deviceIndex} out of range (found ${list.length}). Set Target to 0…${list.length - 1}.`
      )
    }

    const dev = list[this.deviceIndex]
    dev.open()
    this.device = dev

    const iface = dev.interface(0)
    this.iface = iface

    if (process.platform === 'linux' && iface.isKernelDriverActive?.()) {
      try {
        iface.detachKernelDriver()
      } catch {
        /* ignore */
      }
    }
    iface.claim()
    await new Promise<void>((resolve, reject) => {
      iface.setAltSetting(1, (err?: Error) => (err ? reject(err) : resolve()))
    })

    this.intOut = iface.endpoint(EP_INT_OUT)
    this.intIn = iface.endpoint(EP_INT_IN)
    this.bulkOut = iface.endpoint(EP_BULK_OUT)

    // Drain stale interrupt data.
    for (let i = 0; i < 32; i++) {
      try {
        await interruptTransferIn(this.intIn, 32)
      } catch {
        break
      }
    }

    // Firmware version handshake.
    let fwOk = false
    for (let attempt = 0; attempt < 2 && !fwOk; attempt++) {
      await interruptTransfer(this.intOut, Buffer.from([0x04, 0]))
      for (let j = 0; j < 3; j++) {
        const r = await interruptTransferIn(this.intIn, 32)
        if (r.length >= 5 && r[0] === 0x84) {
          fwOk = true
          break
        }
      }
    }
    if (!fwOk) {
      throw new Error('Helios DAC did not respond to firmware query.')
    }

    await interruptTransfer(this.intOut, Buffer.from([0x07, HELIOS_SDK_VERSION]))
  }

  async disconnect(): Promise<void> {
    const iface = this.iface
    const dev = this.device
    this.iface = null
    this.bulkOut = null
    this.intOut = null
    this.intIn = null
    this.device = null
    this.shutterOpen = false
    if (iface) {
      try {
        iface.release(true, () => undefined)
      } catch {
        /* ignore */
      }
    }
    if (dev) {
      try {
        dev.close()
      } catch {
        /* ignore */
      }
    }
  }

  private async ensureShutterOpen() {
    if (this.shutterOpen || !this.intOut) return
    await interruptTransfer(this.intOut, Buffer.from([0x02, 1]))
    this.shutterOpen = true
  }

  async pushFrame(points: LaserDacFramePoint[], pointRatePps: number): Promise<void> {
    if (!this.bulkOut) throw new Error('Helios not connected.')
    if (points.length < 1) return

    let num = Math.min(0xfff, points.length)
    let pps = Math.max(1000, Math.min(0xffff, Math.round(pointRatePps)))
    if (((num - 45) % 64) === 0) {
      num -= 1
      pps = Math.round((pps * num) / (num + 1))
    }

    const frame: number[] = []
    for (let i = 0; i < num; i++) {
      const p = points[i]!
      const hx = toHelios12(p.x)
      const hy = toHelios12Y(p.y)
      const r = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.r)) * 255)
      const g = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.g)) * 255)
      const b = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.b)) * 255)
      const ii = p.blank ? 0 : 255
      frame.push((hx >> 4) & 0xff)
      frame.push(((hx & 0x0f) << 4) | ((hy >> 8) & 0xff))
      frame.push(hy & 0xff)
      frame.push(r, g, b, ii)
    }
    frame.push(pps & 0xff, (pps >> 8) & 0xff)
    frame.push(num & 0xff, (num >> 8) & 0xff)
    frame.push(HELIOS_FLAGS)

    const buf = Buffer.from(frame)
    await this.ensureShutterOpen()
    await bulkTransfer(this.bulkOut, buf)
  }
}
