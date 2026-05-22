import type { LaserDacFramePoint } from '../../shared/laserDac'
import type {
  LaserDacProfile,
  LaserFixtureOutputRoute,
  LaserProjectionZone,
} from '../../shared/laserFixtureRouting'
import { dacSessionId } from '../../shared/laserFixtureRouting'
import type { LaserRgbCapabilities, LaserScene } from './laserEditorTypes'
import type { LaserPresetSplitPin } from './laserPresetCatalog'
import { sampleLaserSceneForDac } from './laserDacSampler'
import { applyZoneToFrame, mergeZoneFrames } from './laserProjectionZoneMath'
import { splitPadRectToCanvasMask } from './laserViewportMask'
import { clamp01 } from './laserAnimationPath'

export type LaserFixtureRenderUnit = {
  id: string
  group: string
  enabled: boolean
  outputRoute: LaserFixtureOutputRoute
  laserChannels: LaserRgbCapabilities
}

export type LaserFixtureSceneContext = {
  scene: LaserScene | null
  splitPin: LaserPresetSplitPin
  animProgress: number
  shapeMotionDelta: { x: number; y: number }
  huePhase01: number
  maxPoints: number
  powerScale: number
}

function scalePower(
  points: LaserDacFramePoint[],
  power: number
): LaserDacFramePoint[] {
  if (power >= 0.999) return points
  return points.map((p) => ({
    ...p,
    r: p.r * power,
    g: p.g * power,
    b: p.b * power,
  }))
}

function findZone(
  profile: LaserDacProfile,
  zoneId: string
): LaserProjectionZone | undefined {
  return profile.zones.find((z) => z.id === zoneId)
}

function sampleForFixture(
  ctx: LaserFixtureSceneContext,
  caps: LaserRgbCapabilities
): LaserDacFramePoint[] {
  if (!ctx.scene) return []
  return sampleLaserSceneForDac(
    ctx.scene,
    ctx.splitPin,
    ctx.animProgress,
    ctx.maxPoints,
    ctx.shapeMotionDelta,
    caps,
    ctx.huePhase01
  )
}

export type DacCompositePush = {
  sessionId: string
  pointRatePps: number
  points: LaserDacFramePoint[]
  zoneFrames?: { zoneIndex: number; points: LaserDacFramePoint[] }[]
}

export type NodePush = DacCompositePush

/**
 * Build ILDA/IDN frames: one composite per connected DAC profile (multi-zone),
 * and one frame per network node fixture.
 */
export function buildLaserOutputPushes(args: {
  fixtures: LaserFixtureRenderUnit[]
  dacProfiles: LaserDacProfile[]
  sceneContextByGroup: Record<string, LaserFixtureSceneContext>
  pointRatePps: number
  outputPower01: number
}): { dacComposites: DacCompositePush[]; nodePushes: NodePush[] } {
  const {
    fixtures,
    dacProfiles,
    sceneContextByGroup,
    pointRatePps,
    outputPower01,
  } = args

  const profileById = new Map(dacProfiles.map((p) => [p.id, p]))
  const zoneFramesByProfile = new Map<
    string,
    Array<{
      priority: number
      zoneIndex: number
      points: LaserDacFramePoint[]
    }>
  >()
  const nodePushes: NodePush[] = []

  for (const unit of fixtures) {
    if (!unit.enabled) continue
    const route = unit.outputRoute
    if (route.kind === 'unassigned') continue

    const ctx =
      sceneContextByGroup[unit.group.trim()] ??
      sceneContextByGroup[unit.group] ??
      null
    if (!ctx?.scene) continue

    const raw = scalePower(
      sampleForFixture(ctx, unit.laserChannels),
      outputPower01
    )
    if (raw.length === 0) continue

    if (route.kind === 'network_node') {
      nodePushes.push({
        sessionId: `node:${route.nodeId}`,
        pointRatePps,
        points: raw,
      })
      continue
    }

    if (route.kind === 'dac_zone') {
      const profile = profileById.get(route.dacProfileId)
      if (!profile) continue
      const zone = findZone(profile, route.zoneId)
      if (!zone) continue
      const zoned = applyZoneToFrame(raw, zone)
      if (zoned.length === 0) continue
      const zoneIndex = profile.zones.findIndex((z) => z.id === route.zoneId)
      if (zoneIndex < 0) continue
      const list = zoneFramesByProfile.get(profile.id) ?? []
      list.push({
        priority: zone.priority ?? 0,
        zoneIndex,
        points: zoned,
      })
      zoneFramesByProfile.set(profile.id, list)
    }
  }

  const dacComposites: DacCompositePush[] = []
  for (const [profileId, entries] of zoneFramesByProfile) {
    const sorted = [...entries].sort((a, b) => a.priority - b.priority)
    const profile = profileById.get(profileId)
    const sessionId = dacSessionId(profileId)
    if (profile?.backend === 'fb4') {
      dacComposites.push({
        sessionId,
        pointRatePps,
        points: [],
        zoneFrames: sorted.map((e) => ({
          zoneIndex: e.zoneIndex,
          points: e.points,
        })),
      })
    } else {
      dacComposites.push({
        sessionId,
        pointRatePps,
        points: mergeZoneFrames(sorted.map((e) => e.points)),
      })
    }
  }

  return { dacComposites, nodePushes }
}

/** Split pin from group lighting split params. */
export function buildSplitPinFromParams(
  splitX: number,
  splitY: number,
  splitW: number,
  splitH: number
): LaserPresetSplitPin {
  const rect = splitPadRectToCanvasMask(splitX, splitY, splitW, splitH)
  return {
    x: clamp01(rect.x),
    y: clamp01(rect.y),
    width: clamp01(rect.w),
    height: clamp01(rect.h),
  }
}
