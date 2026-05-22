import type {
  LaserDacConnectRequest,
  LaserDacConnectResult,
  LaserDacFramePoint,
  LaserDacSessionStatus,
  LaserDacStatus,
} from '../../shared/laserDac'
import { normalizeLaserDacPushFramePayload } from '../../shared/laserDac'
import type { LaserTransport } from './laser/laserTransportTypes'
import { EtherDreamTcpTransport } from './laser/etherDreamTcp'
import { HeliosUsbTransport } from './laser/heliosUsbTransport'
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
const PRIMARY_SESSION = 'primary'

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

export async function laserDacConnect(
  req: LaserDacConnectRequest
): Promise<LaserDacConnectResult> {
  const sid = resolveSessionId(req.sessionId)
  sessionErrors.delete(sid)
  const existing = sessions.get(sid)
  if (existing) {
    try {
      await existing.transport.disconnect()
    } catch {
      /* ignore */
    }
    sessions.delete(sid)
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
      try {
        await s.transport.disconnect()
      } catch {
        /* ignore */
      }
      sessions.delete(sid)
      sessionErrors.delete(sid)
    }
    return
  }
  for (const [key, s] of sessions) {
    try {
      await s.transport.disconnect()
    } catch {
      /* ignore */
    }
    sessions.delete(key)
    sessionErrors.delete(key)
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

export async function laserDacPushFrame(raw: unknown): Promise<void> {
  const payload = normalizeLaserDacPushFramePayload(raw)
  if (payload === null) return
  const sid = resolveSessionId(payload.sessionId)
  const session = sessions.get(sid)
  if (session === null || session === undefined) return
  try {
    await session.transport.pushFrame(
      payload.points as LaserDacFramePoint[],
      payload.pointRatePps,
      payload.zoneFrames?.length
        ? { zoneFrames: payload.zoneFrames }
        : undefined
    )
    sessionErrors.delete(sid)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    sessionErrors.set(sid, msg)
    console.warn(`[laser-dac] pushFrame ${sid}:`, msg)
  }
}
