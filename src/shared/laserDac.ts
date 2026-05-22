/**
 * Laser DAC output — shared between renderer and main (IPC payloads).
 *
 * - **ILDA**: classic ILDA-style projector / DAC framing (USB Helios, Ether Dream, etc.).
 * - **IDN**: ILDA Digital Network — digital streaming path (often TCP/UDP to IDN-capable hardware).
 */

export type LaserOutputProtocol = 'ilda' | 'idn'

export type LaserDacBackend = 'helios' | 'etherdream' | 'fb4' | 'generic'

export const LASER_DAC_BACKENDS: readonly LaserDacBackend[] = [
  'helios',
  'etherdream',
  'fb4',
  'generic',
] as const

export interface LaserDacConnectRequest {
  protocol: LaserOutputProtocol
  backend: LaserDacBackend
  /** Host, URL, serial path, or empty / "Auto discover" depending on backend. */
  target: string
  /** Stable session key, e.g. `dac:main` or `node:front-left`. Defaults to `primary`. */
  sessionId?: string
}

export interface LaserDacConnectResult {
  ok: boolean
  message?: string
}

export type LaserDacSessionStatus = {
  sessionId: string
  connected: boolean
  protocol?: LaserOutputProtocol
  backend?: LaserDacBackend
  target?: string
  lastError?: string
}

export interface LaserDacStatus {
  connected: boolean
  protocol?: LaserOutputProtocol
  backend?: LaserDacBackend
  target?: string
  /** Last transport error (if any), for UI diagnostics. */
  lastError?: string
  /** All open DAC/node sessions (multi-fixture routing). */
  sessions?: LaserDacSessionStatus[]
}

/** One output sample in normalized editor space (x,y 0–1, y down) before DAC remapping. */
export interface LaserDacFramePoint {
  x: number
  y: number
  r: number
  g: number
  b: number
  /** Travel / shutter-off sample (hardware interprets per backend). */
  blank?: boolean
}

export type LaserDacZoneFrame = {
  /** BEYOND zone index (0-based, matches order in DAC profile zones). */
  zoneIndex: number
  points: LaserDacFramePoint[]
}

export interface LaserDacPushFramePayload {
  pointRatePps: number
  points: LaserDacFramePoint[]
  /** FB4 / BEYOND: one frame per projection zone (no merge). */
  zoneFrames?: LaserDacZoneFrame[]
  sessionId?: string
}

export function normalizeLaserDacPushFramePayload(
  raw: unknown
): LaserDacPushFramePayload | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const pps = Number((o as { pointRatePps?: unknown }).pointRatePps)
  if (!Number.isFinite(pps) || pps < 100 || pps > 200000) return null
  const zoneFrames = parseZoneFrames((o as { zoneFrames?: unknown }).zoneFrames)
  const ptsRaw = (o as { points?: unknown }).points
  const points: LaserDacFramePoint[] = []
  if (Array.isArray(ptsRaw)) {
    const max = Math.min(16000, ptsRaw.length)
    for (let i = 0; i < max; i++) {
      const parsed = parseFramePoint(ptsRaw[i])
      if (parsed) points.push(parsed)
    }
  }
  if (points.length === 0 && (!zoneFrames || zoneFrames.length === 0)) {
    return null
  }
  const sessionId =
    typeof (o as { sessionId?: unknown }).sessionId === 'string' &&
    (o as { sessionId: string }).sessionId.trim().length > 0
      ? (o as { sessionId: string }).sessionId.trim()
      : undefined
  return {
    pointRatePps: Math.round(pps),
    points,
    zoneFrames: zoneFrames?.length ? zoneFrames : undefined,
    sessionId,
  }
}

function parseFramePoint(raw: unknown): LaserDacFramePoint | null {
  if (raw === null || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>
  const x = Number(q.x)
  const y = Number(q.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    x,
    y,
    r: clamp01Num(q.r ?? 1),
    g: clamp01Num(q.g ?? 1),
    b: clamp01Num(q.b ?? 1),
    blank: q.blank === true,
  }
}

function parseZoneFrames(raw: unknown): LaserDacZoneFrame[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: LaserDacZoneFrame[] = []
  for (const entry of raw.slice(0, 32)) {
    if (entry === null || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const zoneIndex = Number(e.zoneIndex)
    if (!Number.isFinite(zoneIndex) || zoneIndex < 0 || zoneIndex > 199) {
      continue
    }
    const ptsRaw = e.points
    if (!Array.isArray(ptsRaw) || ptsRaw.length === 0) continue
    const points: LaserDacFramePoint[] = []
    for (let i = 0; i < Math.min(16000, ptsRaw.length); i++) {
      const parsed = parseFramePoint(ptsRaw[i])
      if (parsed) points.push(parsed)
    }
    if (points.length > 0) {
      out.push({ zoneIndex: Math.round(zoneIndex), points })
    }
  }
  return out.length > 0 ? out : null
}

function clamp01Num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function normalizeLaserDacConnectRequest(
  raw: unknown
): LaserDacConnectRequest | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const protocol = o.protocol === 'idn' ? 'idn' : 'ilda'
  const backendRaw = o.backend
  const backend =
    typeof backendRaw === 'string' &&
    (LASER_DAC_BACKENDS as readonly string[]).includes(backendRaw)
      ? (backendRaw as LaserDacBackend)
      : 'generic'
  const target = typeof o.target === 'string' ? o.target : ''
  const sessionId =
    typeof o.sessionId === 'string' && o.sessionId.trim().length > 0
      ? o.sessionId.trim()
      : undefined
  return { protocol, backend, target, sessionId }
}
