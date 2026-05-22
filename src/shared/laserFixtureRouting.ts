import type { LaserDacBackend, LaserOutputProtocol } from './laserDac'

/** Normalized projection canvas rect (origin top-left, 0–1). */
export type LaserProjectionZoneRect = {
  x: number
  y: number
  w: number
  h: number
}

export type LaserProjectionZone = {
  id: string
  name: string
  rect: LaserProjectionZoneRect
  /** When true (default), geometry outside the zone rect is not sent to this scanner. */
  clipOutside?: boolean
  /** Higher values are merged later on a shared DAC (topmost in overlap). */
  priority?: number
}

/** One ILDA DAC device with Quick Show–style projection zones. */
export type LaserDacProfile = {
  id: string
  name: string
  backend: LaserDacBackend
  outputProtocol: LaserOutputProtocol
  connectionTarget: string
  zones: LaserProjectionZone[]
}

/** Network / IDN node — one logical laser endpoint (host or interface). */
export type LaserNetworkNode = {
  id: string
  name: string
  backend: LaserDacBackend
  outputProtocol: LaserOutputProtocol
  /** Host, IP, idn:// URL, or Auto discover. */
  connectionTarget: string
}

export type LaserFixtureOutputRoute =
  | { kind: 'unassigned' }
  | { kind: 'dac_zone'; dacProfileId: string; zoneId: string }
  | { kind: 'network_node'; nodeId: string }

export function dacSessionId(profileId: string): string {
  return `dac:${profileId}`
}

export function nodeSessionId(nodeId: string): string {
  return `node:${nodeId}`
}

export function createDefaultProjectionZone(index = 1): LaserProjectionZone {
  const n = Math.max(1, index)
  const cols = n <= 4 ? n : 2
  const row = Math.floor((n - 1) / cols)
  const col = (n - 1) % cols
  const w = 1 / cols
  const h = n <= 2 ? 1 : 0.5
  return {
    id: `zone-${Date.now()}-${n}`,
    name: `Zone ${n}`,
    rect: {
      x: col * w,
      y: row * h,
      w,
      h,
    },
    clipOutside: true,
    priority: n - 1,
  }
}

export function createDefaultLaserDacProfile(
  id = 'dac-main',
  name = 'Main DAC'
): LaserDacProfile {
  return {
    id,
    name,
    backend: 'helios',
    outputProtocol: 'ilda',
    connectionTarget: 'Auto discover',
    zones: [createDefaultProjectionZone(1)],
  }
}

export function createDefaultLaserNetworkNode(
  index = 1
): LaserNetworkNode {
  return {
    id: `node-${Date.now()}-${index}`,
    name: `Laser node ${index}`,
    backend: 'etherdream',
    outputProtocol: 'ilda',
    connectionTarget: 'Auto discover',
  }
}

export function createUnassignedRoute(): LaserFixtureOutputRoute {
  return { kind: 'unassigned' }
}
