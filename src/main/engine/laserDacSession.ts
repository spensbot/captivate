import type {
  LaserDacConnectRequest,
  LaserDacConnectResult,
  LaserDacFramePoint,
  LaserDacListDevicesRequest,
  LaserDacListDevicesResult,
  LaserDacPushFramePayload,
  LaserDacSessionStatus,
  LaserDacStatus,
} from '../../shared/laserDac'
import { normalizeLaserDacPushFramePayload } from '../../shared/laserDac'
import type { LaserTransport } from './laser/laserTransportTypes'
import { EtherDreamTcpTransport } from './laser/etherDreamTcp'
import { HeliosUsbTransport, scanHeliosUsbDevices } from './laser/heliosUsbTransport'
import { UdpLaserBridgeTransport } from './laser/udpLaserBridgeTransport'
import { Fb4Transport } from './laser/fb4Transport'

type Session = {
  protocol: LaserDacConnectRequest['protocol']
  backend: LaserDacConnectRequest['backend']
  target: string
  transport: LaserTransport
}

const sessions = new Map<string, Session>()
const sessionErrors = new Map<string, string>()
const pendingFrameBySession = new Map<
  string,
  NonNullable<ReturnType<typeof normalizeLaserDacPushFramePayload>>
>()
const pushInFlight = new Set<string>()
const lastContentKeyBySession = new Map<string, string>()
const outputHoldBySession = new Map<string, boolean>()
const PRIMARY_SESSION = 'primary'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForPushDrain(sid: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (pushInFlight.has(sid)) {
    if (Date.now() >= deadline) break
    await sleep(5)
  }
}

function frameContentKey(payload: LaserDacPushFramePayload): string {
  if (payload.contentKey !== undefined && payload.contentKey.length > 0) {
    return `${payload.pointRatePps}|${payload.contentKey}`
  }
  const pts = payload.points
  const n = pts.length
  if (n === 0) {
    return `empty:${payload.pointRatePps}`
  }
  let sig = `${payload.pointRatePps}|${n}`
  const step = Math.max(1, Math.floor(n / 16))
  for (let i = 0; i < n; i += step) {
    const p = pts[i]!
    sig += `|${p.x.toFixed(5)},${p.y.toFixed(5)},${p.r.toFixed(4)},${p.blank ? 1 : 0}`
  }
  return sig
}

function resolveSessionId(id: string | undefined): string {
  const t = id?.trim()
  return t && t.length > 0 ? t : PRIMARY_SESSION
}

function displayTarget(target: string): string {
  const t = target.trim()
  return t.length > 0 ? t : 'Auto discover'
}

function createTransport(req: LaserDacConnectRequest): LaserTransport {
  const { protocol, backend, target } = req
  const t = displayTarget(target)

  if (backend === 'fb4') {
    const sid = resolveSessionId(req.sessionId)
    return new Fb4Transport(t, sid)
  }

  if (backend === 'etherdream') {
    if (protocol !== 'ilda') {
      throw new Error(
        'Ether Dream backend uses ILDA-style samples over the Ether Dream TCP protocol. Switch Output protocol to ILDA.'
      )
    }
    return new EtherDreamTcpTransport(t)
  }

  if (backend === 'helios') {
    if (protocol === 'idn') {
      throw new Error(
        'Helios IDN (network) mode is not wired in Captivate yet. Use Helios with ILDA (USB) or Generic + IDN for the UDP dev bridge.'
      )
    }
    return new HeliosUsbTransport(t)
  }

  if (backend === 'generic') {
    const port = protocol === 'idn' ? 40201 : 40200
    return new UdpLaserBridgeTransport(t, protocol, port)
  }

  throw new Error('Unsupported DAC backend.')
}

export function laserDacListDevices(
  req: LaserDacListDevicesRequest
): LaserDacListDevicesResult {
  if (req.backend === 'helios') {
    const scan = scanHeliosUsbDevices()
    return {
      devices: scan.devices.map((d) => ({
        id: String(d.index),
        label: d.label,
      })),
      message:
        scan.error ??
        (scan.devices.length === 0
          ? 'No Helios USB DAC found (VID 1209 / PID E500).'
          : undefined),
    }
  }
  return { devices: [] }
}

export async function laserDacConnect(
  req: LaserDacConnectRequest
): Promise<LaserDacConnectResult> {
  const sid = resolveSessionId(req.sessionId)
  sessionErrors.delete(sid)
  outputHoldBySession.delete(sid)
  const existing = sessions.get(sid)
  if (existing) {
    outputHoldBySession.set(sid, true)
    pendingFrameBySession.delete(sid)
    await waitForPushDrain(sid)
    try {
      await existing.transport.stopOutput?.()
    } catch {
      /* ignore */
    }
    try {
      await existing.transport.disconnect()
    } catch {
      /* ignore */
    }
    sessions.delete(sid)
    pendingFrameBySession.delete(sid)
    pushInFlight.delete(sid)
    lastContentKeyBySession.delete(sid)
  }
  try {
    const transport = createTransport(req)
    await transport.connect()
    sessions.set(sid, {
      protocol: req.protocol,
      backend: req.backend,
      target: displayTarget(req.target),
      transport,
    })
    pendingFrameBySession.delete(sid)
    lastContentKeyBySession.delete(sid)
    outputHoldBySession.delete(sid)
    console.log(
      `[laser-dac] connected session=${sid}: protocol=${req.protocol} backend=${req.backend} target=${displayTarget(req.target)}`
    )
    return {
      ok: true,
      message: `Connected (${sid}).`,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    sessionErrors.set(sid, msg)
    return { ok: false, message: msg }
  }
}

export async function laserDacDisconnect(sessionId?: string): Promise<void> {
  const sid = sessionId !== undefined ? resolveSessionId(sessionId) : undefined
  if (sid !== undefined) {
    const s = sessions.get(sid)
    if (s) {
      outputHoldBySession.set(sid, true)
      pendingFrameBySession.delete(sid)
      await waitForPushDrain(sid)
      try {
        await s.transport.stopOutput?.()
      } catch {
        /* ignore */
      }
      try {
        await s.transport.disconnect()
      } catch {
        /* ignore */
      }
      sessions.delete(sid)
      sessionErrors.delete(sid)
      pushInFlight.delete(sid)
      lastContentKeyBySession.delete(sid)
      outputHoldBySession.delete(sid)
    }
    return
  }
  for (const [key, s] of sessions) {
    outputHoldBySession.set(key, true)
    pendingFrameBySession.delete(key)
    await waitForPushDrain(key)
    try {
      await s.transport.stopOutput?.()
    } catch {
      /* ignore */
    }
    try {
      await s.transport.disconnect()
    } catch {
      /* ignore */
    }
    sessions.delete(key)
    sessionErrors.delete(key)
    pushInFlight.delete(key)
    lastContentKeyBySession.delete(key)
    outputHoldBySession.delete(key)
  }
}

function sessionStatusList(): LaserDacSessionStatus[] {
  const list: LaserDacSessionStatus[] = []
  for (const [sessionId, s] of sessions) {
    list.push({
      sessionId,
      connected: true,
      protocol: s.protocol,
      backend: s.backend,
      target: s.target,
      lastError: sessionErrors.get(sessionId),
    })
  }
  return list.sort((a, b) => a.sessionId.localeCompare(b.sessionId))
}

export function laserDacStatus(): LaserDacStatus {
  const list = sessionStatusList()
  const primary =
    sessions.get(PRIMARY_SESSION) ??
    (list[0] ? sessions.get(list[0].sessionId) : undefined)
  if (list.length === 0) {
    const err = sessionErrors.get(PRIMARY_SESSION)
    return { connected: false, lastError: err, sessions: [] }
  }
  const first = list[0]!
  const pick = primary
    ? {
        protocol: primary.protocol,
        backend: primary.backend,
        target: primary.target,
      }
    : {
        protocol: first.protocol,
        backend: first.backend,
        target: first.target,
      }
  return {
    connected: true,
    ...pick,
    lastError: sessionErrors.get(first.sessionId),
    sessions: list,
  }
}

async function drainSessionFrames(sid: string, session: Session): Promise<void> {
  pushInFlight.add(sid)
  try {
    while (true) {
      if (outputHoldBySession.get(sid)) return
      const payload = pendingFrameBySession.get(sid)
      if (payload === undefined) return
      pendingFrameBySession.delete(sid)

      const contentKey = frameContentKey(payload)
      if (contentKey === lastContentKeyBySession.get(sid)) {
        sessionErrors.delete(sid)
        continue
      }

      if (outputHoldBySession.get(sid)) return

      try {
        await session.transport.pushFrame(
          payload.points as LaserDacFramePoint[],
          payload.pointRatePps,
          payload.zoneFrames?.length
            ? { zoneFrames: payload.zoneFrames }
            : undefined
        )
        if (outputHoldBySession.get(sid)) {
          await session.transport.stopOutput?.()
          return
        }
        lastContentKeyBySession.set(sid, contentKey)
        sessionErrors.delete(sid)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        sessionErrors.set(sid, msg)
        lastContentKeyBySession.delete(sid)
        console.warn(`[laser-dac] pushFrame ${sid}:`, msg)
      }
    }
  } finally {
    pushInFlight.delete(sid)
    if (pendingFrameBySession.has(sid) && !outputHoldBySession.get(sid)) {
      void drainSessionFrames(sid, session)
    }
  }
}

export async function laserDacStopOutput(sessionId?: string): Promise<void> {
  const stopOne = async (sid: string, s: Session) => {
    outputHoldBySession.set(sid, true)
    pendingFrameBySession.delete(sid)
    await waitForPushDrain(sid)
    lastContentKeyBySession.delete(sid)
    try {
      await s.transport.stopOutput?.()
      sessionErrors.delete(sid)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      sessionErrors.set(sid, msg)
    }
  }

  const sid = sessionId !== undefined ? resolveSessionId(sessionId) : undefined
  if (sid !== undefined) {
    const s = sessions.get(sid)
    if (!s) return
    await stopOne(sid, s)
    return
  }
  for (const [key, s] of sessions) {
    await stopOne(key, s)
  }
}

export async function laserDacPushFrame(raw: unknown): Promise<void> {
  const payload = normalizeLaserDacPushFramePayload(raw)
  if (payload === null) return
  const sid = resolveSessionId(payload.sessionId)
  const session = sessions.get(sid)
  if (session === undefined) return

  outputHoldBySession.set(sid, false)
  pendingFrameBySession.set(sid, payload)
  if (pushInFlight.has(sid)) return
  await drainSessionFrames(sid, session)
}
