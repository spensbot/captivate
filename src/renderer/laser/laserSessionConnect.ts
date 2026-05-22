import {
  dacSessionId,
  nodeSessionId,
  type LaserDacProfile,
  type LaserFixtureOutputRoute,
} from '../../shared/laserFixtureRouting'
import type { LaserFixtureUnitState } from './laserProjectState'

export type RequiredLaserSession = {
  sessionId: string
  kind: 'dac' | 'node'
  dacProfile?: LaserDacProfile
  nodeId?: string
}

export function collectRequiredLaserSessions(
  units: LaserFixtureUnitState[],
  dacProfiles: LaserDacProfile[]
): RequiredLaserSession[] {
  const profileById = new Map(dacProfiles.map((p) => [p.id, p]))
  const dacIds = new Set<string>()
  const nodeIds = new Set<string>()
  const out: RequiredLaserSession[] = []

  for (const unit of units) {
    if (!unit.enabled) continue
    const route = unit.outputRoute
    if (route.kind === 'dac_zone') {
      if (dacIds.has(route.dacProfileId)) continue
      dacIds.add(route.dacProfileId)
      const profile = profileById.get(route.dacProfileId)
      if (profile) {
        out.push({
          sessionId: dacSessionId(route.dacProfileId),
          kind: 'dac',
          dacProfile: profile,
        })
      }
    } else if (route.kind === 'network_node') {
      if (nodeIds.has(route.nodeId)) continue
      nodeIds.add(route.nodeId)
      out.push({
        sessionId: nodeSessionId(route.nodeId),
        kind: 'node',
        nodeId: route.nodeId,
      })
    }
  }
  return out
}

export function routeUsesSession(
  route: LaserFixtureOutputRoute,
  sessionId: string
): boolean {
  if (route.kind === 'dac_zone' && sessionId === dacSessionId(route.dacProfileId)) {
    return true
  }
  if (route.kind === 'network_node' && sessionId === nodeSessionId(route.nodeId)) {
    return true
  }
  return false
}
