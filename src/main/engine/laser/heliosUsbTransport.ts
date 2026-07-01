/**
 * Helios USB DAC (Grix / Helios) — ILDA path via libusb-compatible `usb` package.
 * VID/PID and framing from official SDK (MIT).
 */
import type { LaserDacFramePoint } from '../../../shared/laserDac'
import { pickHeliosDeviceTarget } from '../../../shared/laserHeliosConnection'
import type { LaserTransport } from './laserTransportTypes'

const HELIOS_VID = 0x1209
const HELIOS_PID = 0xe500
const EP_INT_OUT = 0x06
const EP_INT_IN = 0x83
const EP_BULK_OUT = 0x02
const HELIOS_SDK_VERSION = 11
/** Loop on-device until replaced — one USB transfer per unique frame. */
const HELIOS_FLAGS_LOOP = 0

const LIBUSB_ERROR_TIMEOUT = -7
const LIBUSB_ERROR_IO = -1
const LIBUSB_ERROR_BUSY = 6
const LIBUSB_ERROR_ACCESS = 13
const LIBUSB_ERROR_NOT_SUPPORTED = 12

const HELIOS_INT_TRANSFER_TIMEOUT_MS = 32
const HELIOS_BULK_TRANSFER_TIMEOUT_MIN_MS = 2000
const HELIOS_DRAIN_TRANSFER_TIMEOUT_MS = 5
const HELIOS_POST_OPEN_SETTLE_MS = 100
const HELIOS_POST_RELEASE_SETTLE_MS = 50

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getUsbModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('usb')
  } catch {
    return null
  }
}

export type HeliosDeviceInfo = {
  index: number
  label: string
}

export type HeliosUsbScanResult = {
  devices: HeliosDeviceInfo[]
  error?: string
}

function filterHeliosDevices(usb: any): any[] {
  return usb.getDeviceList().filter(
    (d: any) =>
      d.deviceDescriptor?.idVendor === HELIOS_VID &&
      d.deviceDescriptor?.idProduct === HELIOS_PID
  )
}

function labelHeliosDevice(d: any): string {
  const bus = d.busNumber
  const port = Array.isArray(d.portNumbers) ? d.portNumbers.join('.') : ''
  const suffix =
    bus !== undefined && port.length > 0 ? ` · USB ${bus}-${port}` : ''
  return `Helios DAC${suffix}`
}

export function scanHeliosUsbDevices(): HeliosUsbScanResult {
  const usb = getUsbModule()
  if (!usb) {
    return {
      devices: [],
      error:
        'USB support is not available in this build. Reinstall Captivate or rebuild native modules.',
    }
  }
  if (usb.INIT_ERROR) {
    return {
      devices: [],
      error:
        'USB library failed to initialize. Reinstall Captivate or rebuild native modules.',
    }
  }
  try {
    const devices = filterHeliosDevices(usb).map((d: any, index: number) => ({
      index,
      label: labelHeliosDevice(d),
    }))
    return { devices }
  } catch (e) {
    return {
      devices: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export function listHeliosUsbDevices(): HeliosDeviceInfo[] {
  return scanHeliosUsbDevices().devices
}

function formatHeliosUsbError(err: unknown, step: string): Error {
  const errno =
    err !== null &&
    typeof err === 'object' &&
    'errno' in err &&
    typeof (err as { errno?: unknown }).errno === 'number'
      ? (err as { errno: number }).errno
      : undefined
  const raw = err instanceof Error ? err.message : String(err)
  const upper = raw.toUpperCase()

  if (
    errno === LIBUSB_ERROR_NOT_SUPPORTED ||
    upper.includes('NOT_SUPPORTED') ||
    upper.includes('NOT SUPPORTED')
  ) {
    return new Error(
      `${step}: Windows could not open the Helios USB device with the current driver. ` +
        'Close other laser software, unplug and replug the Helios, then try again.'
    )
  }
  if (errno === LIBUSB_ERROR_ACCESS || upper.includes('ACCESS')) {
    return new Error(
      `${step}: The Helios is in use by another application or blocked by USB permissions. ` +
        'Quit other laser show apps, then retry Test connection.'
    )
  }
  if (errno === LIBUSB_ERROR_BUSY || upper.includes('BUSY')) {
    return new Error(
      `${step}: The Helios USB device is busy. Unplug and replug USB, then retry.`
    )
  }
  if (
    errno === LIBUSB_ERROR_IO ||
    upper.includes('LIBUSB_ERROR_IO') ||
    upper.includes('ERROR_IO')
  ) {
    return new Error(
      `${step}: USB I/O failed while talking to the Helios. ` +
        'Close other laser software, unplug and replug the DAC, then retry Test connection.'
    )
  }
  if (
    errno === LIBUSB_ERROR_TIMEOUT ||
    upper.includes('LIBUSB_TRANSFER_TIMED_OUT') ||
    upper.includes('TRANSFER_TIMED_OUT') ||
    upper.includes('TIMED_OUT')
  ) {
    return new Error(
      `${step}: Helios USB transfer timed out. The DAC may be busy — unplug USB, close other laser software, and reconnect.`
    )
  }
  return new Error(`${step}: ${raw}`)
}

function isUsbTimeoutError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false
  const errno =
    'errno' in err && typeof (err as { errno?: unknown }).errno === 'number'
      ? (err as { errno: number }).errno
      : undefined
  const raw = err instanceof Error ? err.message : String(err)
  const upper = raw.toUpperCase()
  return (
    errno === LIBUSB_ERROR_TIMEOUT ||
    upper.includes('LIBUSB_TRANSFER_TIMED_OUT') ||
    upper.includes('TRANSFER_TIMED_OUT')
  )
}

/** 12-bit Helios coordinate (0–0xFFF). Y is flipped vs editor space (origin top-left). */
function toHeliosCoord12(v01: number): number {
  const v = Math.max(0, Math.min(1, v01))
  return Math.round(v * 0xfff) & 0xfff
}

function toHeliosCoord12Y(y01: number): number {
  return toHeliosCoord12(1 - y01)
}

/** Pack one point into 7 USB bytes (matches official Helios SDK `SendFrame`). */
function packHeliosPointBytes(
  x01: number,
  y01: number,
  r: number,
  g: number,
  b: number,
  intensity: number
): [number, number, number, number, number, number, number] {
  const x = toHeliosCoord12(x01)
  const y = toHeliosCoord12Y(y01)
  return [
    (x >> 4) & 0xff,
    ((x & 0x0f) << 4) | ((y >> 8) & 0xff),
    y & 0xff,
    r,
    g,
    b,
    intensity,
  ]
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

function releaseInterfaceAsync(iface: {
  release: (closeEndpoints: boolean, callback: (err?: Error) => void) => void
}): Promise<void> {
  return new Promise((resolve) => {
    try {
      iface.release(true, () => resolve())
    } catch {
      resolve()
    }
  })
}

function clearEndpointHalt(ep: {
  clearHalt?: (callback: (err?: Error) => void) => void
}): Promise<void> {
  if (typeof ep.clearHalt !== 'function') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    ep.clearHalt(() => resolve())
  })
}

function setAltSettingAsync(
  iface: { setAltSetting: (alt: number, cb: (err?: Error) => void) => void },
  alt: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    iface.setAltSetting(alt, (err?: Error) => (err ? reject(err) : resolve()))
  })
}

function detachKernelDriverIfNeeded(iface: any): void {
  try {
    if (typeof iface.isKernelDriverActive === 'function' && iface.isKernelDriverActive()) {
      iface.detachKernelDriver()
    }
  } catch {
    /* ignore — not supported on all platforms */
  }
}

let heliosUsbSerial: Promise<void> = Promise.resolve()

function withHeliosUsbLock<T>(run: () => Promise<T>): Promise<T> {
  const next = heliosUsbSerial.then(run, run)
  heliosUsbSerial = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

export class HeliosUsbTransport implements LaserTransport {
  private readonly target: string
  private deviceIndex = 0
  private device: any = null
  private iface: any = null
  private bulkOut: any = null
  private intOut: any = null
  private intIn: any = null
  private shutterOpen = false
  private lastSentFrame: Buffer | null = null

  constructor(target: string) {
    this.target = target
  }

  async connect(): Promise<void> {
    return withHeliosUsbLock(async () => {
      await this.disconnectInternal()
      const usb = getUsbModule()
    if (!usb) {
      throw new Error(
        'Native `usb` module not available. Reinstall Captivate or rebuild native modules.'
      )
    }
    if (usb.INIT_ERROR) {
      throw new Error(
        'USB library failed to initialize. Reinstall Captivate or rebuild native modules.'
      )
    }

    const list = filterHeliosDevices(usb)
    if (list.length === 0) {
      throw new Error('No Helios USB DAC found (VID 1209 / PID E500).')
    }

    const deviceChoices = list.map((d: any, index: number) => ({
      id: String(index),
      label: labelHeliosDevice(d),
    }))
    const picked = pickHeliosDeviceTarget(deviceChoices, this.target)
    this.deviceIndex = parseInt(picked, 10)
    if (!Number.isFinite(this.deviceIndex) || this.deviceIndex < 0) {
      this.deviceIndex = 0
    }
    if (this.deviceIndex >= list.length) {
      throw new Error(
        `Helios device index ${this.deviceIndex} out of range (found ${list.length}).`
      )
    }

    const dev = list[this.deviceIndex]
    try {
      if (typeof dev.open === 'function') {
        dev.open()
      }
    } catch (e) {
      throw formatHeliosUsbError(e, 'Open Helios USB device')
    }
    this.device = dev
    dev.timeout = 1000

    try {
      if (typeof dev.setAutoDetachKernelDriver === 'function') {
        dev.setAutoDetachKernelDriver(true)
      }
    } catch {
      /* optional — often NOT_SUPPORTED with WinUSB */
    }

    await sleep(HELIOS_POST_OPEN_SETTLE_MS)

    let iface: any
    try {
      iface = dev.interface(0)
    } catch (e) {
      throw formatHeliosUsbError(e, 'Read Helios USB interface')
    }
    this.iface = iface

    detachKernelDriverIfNeeded(iface)

    try {
      iface.claim()
    } catch (e) {
      throw formatHeliosUsbError(e, 'Claim Helios USB interface')
    }

    try {
      await setAltSettingAsync(iface, 1)
    } catch (e) {
      throw formatHeliosUsbError(e, 'Set Helios alternate USB setting')
    }

    this.intOut = iface.endpoint(EP_INT_OUT)
    this.intIn = iface.endpoint(EP_INT_IN)
    this.bulkOut = iface.endpoint(EP_BULK_OUT)
    if (!this.intOut || !this.intIn || !this.bulkOut) {
      throw new Error(
        'Helios USB endpoints missing after connect. Try unplugging and replugging the DAC.'
      )
    }

    this.intOut.timeout = HELIOS_INT_TRANSFER_TIMEOUT_MS
    this.intIn.timeout = HELIOS_INT_TRANSFER_TIMEOUT_MS
    this.bulkOut.timeout = 1000

    await clearEndpointHalt(this.intOut)
    await clearEndpointHalt(this.intIn)
    await clearEndpointHalt(this.bulkOut)

    // Drain stale interrupt data (matches official SDK; short timeout per read).
    const priorInTimeout = this.intIn.timeout
    this.intIn.timeout = HELIOS_DRAIN_TRANSFER_TIMEOUT_MS
    try {
      while (true) {
        try {
          await interruptTransferIn(this.intIn, 32)
        } catch {
          break
        }
      }
    } finally {
      this.intIn.timeout = priorInTimeout
    }

    // Firmware version handshake.
    let fwOk = false
    for (let attempt = 0; attempt < 2 && !fwOk; attempt++) {
      try {
        await interruptTransfer(this.intOut, Buffer.from([0x04, 0]))
      } catch (e) {
        throw formatHeliosUsbError(e, 'Helios firmware query')
      }
      for (let j = 0; j < 3; j++) {
        const r = await interruptTransferIn(this.intIn, 32)
        if (r.length >= 5 && r[0] === 0x84) {
          fwOk = true
          break
        }
      }
    }
    if (!fwOk) {
      throw new Error(
        'Helios DAC did not respond to firmware query. Close other laser software, unplug USB, and try again.'
      )
    }

    try {
      await interruptTransfer(this.intOut, Buffer.from([0x07, HELIOS_SDK_VERSION]))
    } catch (e) {
      throw formatHeliosUsbError(e, 'Helios SDK version handshake')
    }

    // Reset playback left over from an unclean previous session (killed app, etc.).
    try {
      await interruptTransfer(this.intOut, Buffer.from([0x01, 0]))
      await sleep(25)
    } catch {
      /* ignore */
    }

    await interruptTransfer(this.intOut, Buffer.from([0x02, 1]))
    this.shutterOpen = true
    this.lastSentFrame = null
    })
  }

  async stopOutput(): Promise<void> {
    return withHeliosUsbLock(async () => {
      this.lastSentFrame = null
      await this.stopOutputInternal()
    })
  }

  private buildFrameBuffer(
    points: LaserDacFramePoint[],
    pointRatePps: number,
    flags = HELIOS_FLAGS_LOOP
  ): Buffer {
    let num = Math.min(0xfff, points.length)
    let pps = Math.max(1000, Math.min(0xffff, Math.round(pointRatePps)))
    if ((num - 45) % 64 === 0) {
      num -= 1
      pps = Math.round((pps * num) / (num + 1))
    }
    const frame: number[] = []
    for (let i = 0; i < num; i++) {
      const p = points[i]!
      const r = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.r)) * 255)
      const g = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.g)) * 255)
      const b = p.blank ? 0 : Math.round(Math.max(0, Math.min(1, p.b)) * 255)
      const ii = p.blank ? 0 : 255
      frame.push(...packHeliosPointBytes(p.x, p.y, r, g, b, ii))
    }
    frame.push(pps & 0xff, (pps >> 8) & 0xff)
    frame.push(num & 0xff, (num >> 8) & 0xff)
    frame.push(flags)
    return Buffer.from(frame)
  }

  private async sendFrameBuffer(buf: Buffer): Promise<void> {
    if (!this.bulkOut || !this.intOut) {
      throw new Error('Helios not connected.')
    }
    if (this.lastSentFrame !== null && buf.equals(this.lastSentFrame)) {
      return
    }
    await this.ensureShutterOpen()
    await clearEndpointHalt(this.bulkOut)

    const bulkTimeoutMs = Math.max(
      HELIOS_BULK_TRANSFER_TIMEOUT_MIN_MS,
      8 + (buf.length >> 5)
    )
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.bulkOut.timeout = bulkTimeoutMs
        await bulkTransfer(this.bulkOut, buf)
        this.lastSentFrame = buf
        return
      } catch (e) {
        lastErr = e
        if (!isUsbTimeoutError(e)) {
          this.lastSentFrame = null
        }
        if (!isUsbTimeoutError(e) || attempt >= 2) break
        await clearEndpointHalt(this.bulkOut)
        await sleep(12 * (attempt + 1))
      }
    }
    throw formatHeliosUsbError(lastErr, 'Helios bulk frame transfer')
  }

  private async stopOutputInternal(): Promise<void> {
    const intOut = this.intOut
    if (!intOut) return

    try {
      await interruptTransfer(intOut, Buffer.from([0x01, 0]))
      await sleep(25)
    } catch {
      /* ignore */
    }
    try {
      await interruptTransfer(intOut, Buffer.from([0x02, 0]))
      this.shutterOpen = false
    } catch {
      /* ignore */
    }
    this.lastSentFrame = null
  }

  async disconnect(): Promise<void> {
    return withHeliosUsbLock(() => this.disconnectInternal())
  }

  private async disconnectInternal(): Promise<void> {
    const iface = this.iface
    const dev = this.device
    const intOut = this.intOut
    this.iface = null
    this.bulkOut = null
    this.intOut = null
    this.intIn = null
    this.device = null
    this.shutterOpen = false
    this.lastSentFrame = null
    if (intOut) {
      try {
        await interruptTransfer(intOut, Buffer.from([0x01, 0]))
        await sleep(100)
      } catch {
        /* ignore */
      }
    }
    if (iface) {
      await releaseInterfaceAsync(iface)
    }
    if (dev) {
      try {
        dev.close()
      } catch {
        /* ignore */
      }
    }
    await sleep(HELIOS_POST_RELEASE_SETTLE_MS)
  }

  private async ensureShutterOpen() {
    if (this.shutterOpen || !this.intOut) return
    await interruptTransfer(this.intOut, Buffer.from([0x02, 1]))
    this.shutterOpen = true
  }

  async pushFrame(points: LaserDacFramePoint[], pointRatePps: number): Promise<void> {
    return withHeliosUsbLock(() => this.pushFrameInternal(points, pointRatePps))
  }

  private async pushFrameInternal(
    points: LaserDacFramePoint[],
    pointRatePps: number
  ): Promise<void> {
    if (!this.bulkOut || !this.intOut || !this.intIn) {
      throw new Error('Helios not connected.')
    }
    if (points.length < 1) return

    const buf = this.buildFrameBuffer(points, pointRatePps, HELIOS_FLAGS_LOOP)
    await this.sendFrameBuffer(buf)
  }
}
