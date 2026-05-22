import type { LaserDacFramePoint } from '../../../shared/laserDac'
import type { LaserTransport, LaserTransportPushOptions } from './laserTransportTypes'
import { captivatePointsToBeyond } from './pangolinBeyondConvert'
import {
  loadPangolinBeyondSdk,
  sendBeyondFrame,
  waitForBeyondReady,
  type PangolinBeyondApi,
} from './pangolinBeyondSdk'

function zoneImageName(sessionKey: string, zoneIndex0: number): string {
  return `Captivate_${sessionKey}_Z${zoneIndex0}`
}

/**
 * Pangolin FB4 output via BEYOND + BEYONDIO.dll (Windows).
 * BEYOND must be running; each Captivate projection zone maps to a BEYOND zone image.
 */
export class Fb4Transport implements LaserTransport {
  private readonly target: string
  private readonly sessionKey: string
  private api: PangolinBeyondApi | null = null
  private readonly createdImages = new Set<string>()

  constructor(target: string, sessionKey = 'fb4') {
    this.target = target.trim()
    this.sessionKey = sessionKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)
  }

  async connect(): Promise<void> {
    const api = loadPangolinBeyondSdk(this.target)
    const created = api.ldbCreate()
    if (created !== 1) {
      throw new Error(
        'ldbCreate failed. Start Pangolin BEYOND, then connect again. Ensure BEYONDIO.dll is on PATH or set Target to the DLL path.'
      )
    }
    const ready = await waitForBeyondReady(api)
    if (!ready) {
      api.ldbDestroy()
      throw new Error(
        'BEYOND is not ready (ldbBeyondExeReady). Launch Pangolin BEYOND and wait until it is fully loaded, then connect.'
      )
    }
    api.ldbEnableLaserOutput()
    this.api = api
  }

  async disconnect(): Promise<void> {
    const api = this.api
    if (!api) return
    for (const name of [...this.createdImages]) {
      try {
        sendBeyondFrame(api, name, [], 0, 30000)
        api.ldbDeleteZoneImage(name)
      } catch {
        /* ignore cleanup errors */
      }
    }
    this.createdImages.clear()
    try {
      api.ldbDisableLaserOutput()
    } catch {
      /* ignore */
    }
    api.ldbDestroy()
    this.api = null
  }

  private async ensureZoneImage(zoneIndex0: number): Promise<string> {
    const api = this.api
    if (!api) throw new Error('FB4 transport not connected.')
    const name = zoneImageName(this.sessionKey, zoneIndex0)
    if (this.createdImages.has(name)) return name
    const ok = api.ldbCreateZoneImage(zoneIndex0, name)
    if (ok !== 1) {
      throw new Error(
        `ldbCreateZoneImage failed for zone ${zoneIndex0} (${name}). Check BEYOND zone count (ldbGetZoneCount=${api.ldbGetZoneCount()}).`
      )
    }
    this.createdImages.add(name)
    return name
  }

  async pushFrame(
    points: LaserDacFramePoint[],
    pointRatePps: number,
    options?: LaserTransportPushOptions
  ): Promise<void> {
    const api = this.api
    if (!api) return

    const zoneFrames = options?.zoneFrames
    if (zoneFrames && zoneFrames.length > 0) {
      for (const zf of zoneFrames) {
        const zoneIndex0 = Math.max(0, Math.min(199, Math.round(zf.zoneIndex)))
        const imageName = await this.ensureZoneImage(zoneIndex0)
        const beyondPts = captivatePointsToBeyond(zf.points)
        sendBeyondFrame(api, imageName, beyondPts, zoneIndex0, pointRatePps)
      }
      return
    }

    if (points.length === 0) return
    const imageName = await this.ensureZoneImage(0)
    const beyondPts = captivatePointsToBeyond(points)
    sendBeyondFrame(api, imageName, beyondPts, 0, pointRatePps)
  }
}
