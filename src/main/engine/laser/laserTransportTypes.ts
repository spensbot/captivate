import type { LaserDacFramePoint } from '../../../shared/laserDac'

export type LaserDacZoneFrame = {
  zoneIndex: number
  points: LaserDacFramePoint[]
}

export type LaserTransportPushOptions = {
  /** Per-zone frames for FB4 / BEYOND (one BEYOND zone image per entry). */
  zoneFrames?: LaserDacZoneFrame[]
}

export interface LaserTransport {
  /** TCP/USB connect — throws on failure. */
  connect(): Promise<void>
  /** Tear down IO. */
  disconnect(): Promise<void>
  /** Push one frame worth of samples at the given point rate. */
  pushFrame(
    points: LaserDacFramePoint[],
    pointRatePps: number,
    options?: LaserTransportPushOptions
  ): Promise<void>
}
