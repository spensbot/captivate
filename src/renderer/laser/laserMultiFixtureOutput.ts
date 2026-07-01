import type { LaserDacFramePoint } from '../../shared/laserDac'
import type {
  LaserDacProfile,
  LaserFixtureOutputRoute,
  LaserProjectionZone,
} from '../../shared/laserFixtureRouting'
import { dacSessionId } from '../../shared/laserFixtureRouting'
import {
  LASER_DAC_SCAN_RATE_DEFAULT_PPS,
  resolveLaserDacHardwareSettings,
} from '../../shared/laserHardwareSettings'
import type { LaserRgbCapabilities, LaserScene } from './laserEditorTypes'
import type { LaserPresetSplitPin } from './laserPresetCatalog'
import { sampleLaserSceneForDac } from './laserDacSampler'
import { applyZoneToFrame, mergeZoneFrames } from './laserProjectionZoneMath'
import { splitPadRectToCanvasMask } from './laserViewportMask'
import { clamp01 } from './laserAnimationPath'
import { applyLaserHardwareSettingsToFrame } from './laserCalibration'
import {
  resolveIldaTestPatternScanRatePps,
  sampleLaserCalibrationPattern,
} from './laserCalibrationPattern'

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

function applyHardwareForOutput(
  points: LaserDacFramePoint[],
  hardware: ReturnType<typeof resolveLaserDacHardwareSettings>
): LaserDacFramePoint[] {
  return applyLaserHardwareSettingsToFrame(points, hardware)
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
  contentKey: string
}

function hardwareContentKey(
  profileId: string,
  hardware: ReturnType<typeof resolveLaserDacHardwareSettings>,
  mode: 'scene' | 'test_pattern',
  sceneRevision = ''
): string {
  const c = hardware.calibration
  return [
    profileId,
    mode,
    sceneRevision,
    hardware.scanRatePps,
    hardware.colorMode,
    hardware.outputPower01.toFixed(3),
    c.masterSizePct,
    c.sizeXPct,
    c.sizeYPct,
    c.rotationDeg.toFixed(2),
    c.positionX.toFixed(4),
    c.positionY.toFixed(4),
  ].join('|')
}

function sceneContentRevision(
  scene: LaserScene | null | undefined,
  animProgress = 0
): string {
  if (!scene) return 'none'
  let pointCount = 0
  let checksum = 0
  for (const layer of scene.layers) {
    pointCount += layer.points.length
    if (layer.points.length > 0) {
      const p0 = layer.points[0]!
      const pl = layer.points[layer.points.length - 1]!
      checksum +=
        Math.round(p0.x * 1e4) +
        Math.round(p0.y * 1e4) +
        Math.round(pl.x * 1e4) +
        Math.round(pl.y * 1e4)
    }
  }
  return `${scene.id}|${scene.layers.length}|${pointCount}|${checksum}|${scene.contentMode ?? 'draw'}|${animProgress.toFixed(4)}`
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
  /** Fallback when a profile has no stored hardware settings (legacy). */
  defaultOutputPower01?: number
  /** When set, fixtures on this DAC profile stream the built-in calibration pattern. */
  calibrationTestPatternProfileId?: string | null
}): { dacComposites: DacCompositePush[]; nodePushes: NodePush[] } {
  const {
    fixtures,
    dacProfiles,
    sceneContextByGroup,
    defaultOutputPower01 = 0.75,
    calibrationTestPatternProfileId = null,
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
  const contentKeyByProfile = new Map<string, string>()
  const nodePushes: NodePush[] = []

  for (const unit of fixtures) {
    if (!unit.enabled) continue
    const route = unit.outputRoute
    if (route.kind === 'unassigned') continue

    const ctx =
      sceneContextByGroup[unit.group.trim()] ??
      sceneContextByGroup[unit.group] ??
      null

    if (route.kind === 'dac_zone') {
      const profile = profileById.get(route.dacProfileId)
      if (!profile) continue
      const useTestPattern =
        calibrationTestPatternProfileId !== null &&
        calibrationTestPatternProfileId.length > 0 &&
        route.dacProfileId === calibrationTestPatternProfileId

      let sampled: LaserDacFramePoint[]
      if (useTestPattern) {
        sampled = sampleLaserCalibrationPattern()
      } else {
        if (!ctx?.scene) continue
        sampled = sampleForFixture(ctx, unit.laserChannels)
      }
      if (sampled.length === 0) continue

      const hardware = resolveLaserDacHardwareSettings(profile)
      contentKeyByProfile.set(
        profile.id,
        hardwareContentKey(
          profile.id,
          hardware,
          useTestPattern ? 'test_pattern' : 'scene',
          useTestPattern ? '' : sceneContentRevision(ctx?.scene, ctx?.animProgress ?? 0)
        )
      )
      const processed = applyHardwareForOutput(
        scalePower(sampled, hardware.outputPower01),
        hardware
      )
      const zone = findZone(profile, route.zoneId) ?? profile.zones[0]
      if (!zone) continue
      const zoned = useTestPattern
        ? processed
        : applyZoneToFrame(processed, zone)
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
      continue
    }

    if (!ctx?.scene) continue
    const sampled = sampleForFixture(ctx, unit.laserChannels)
    if (sampled.length === 0) continue

    if (route.kind === 'network_node') {
      nodePushes.push({
        sessionId: `node:${route.nodeId}`,
        pointRatePps: LASER_DAC_SCAN_RATE_DEFAULT_PPS,
        contentKey: `node:${route.nodeId}|scene`,
        points: scalePower(sampled, defaultOutputPower01),
      })
      continue
    }
  }

  if (
    calibrationTestPatternProfileId !== null &&
    calibrationTestPatternProfileId.length > 0 &&
    !zoneFramesByProfile.has(calibrationTestPatternProfileId)
  ) {
    const profile = profileById.get(calibrationTestPatternProfileId)
    if (profile) {
      const hardware = resolveLaserDacHardwareSettings(profile)
      contentKeyByProfile.set(
        profile.id,
        hardwareContentKey(profile.id, hardware, 'test_pattern')
      )
      const processed = applyHardwareForOutput(
        scalePower(sampleLaserCalibrationPattern(), hardware.outputPower01),
        hardware
      )
      if (processed.length > 0) {
        zoneFramesByProfile.set(calibrationTestPatternProfileId, [
          {
            priority: 0,
            zoneIndex: 0,
            points: processed,
          },
        ])
      }
    }
  }

  // Scene fallback when fixture zone routing produced nothing (stale zone IDs, etc.).
  if (
    calibrationTestPatternProfileId === null ||
    calibrationTestPatternProfileId.length === 0
  ) {
    for (const profile of dacProfiles) {
      if (zoneFramesByProfile.has(profile.id)) continue
      const routedFixtures = fixtures.filter(
        (unit) =>
          unit.enabled &&
          unit.outputRoute.kind === 'dac_zone' &&
          unit.outputRoute.dacProfileId === profile.id
      )
      if (routedFixtures.length === 0) continue
      const unit = routedFixtures[0]!
      const ctx =
        sceneContextByGroup[unit.group.trim()] ??
        sceneContextByGroup[unit.group] ??
        null
      if (!ctx?.scene) continue
      const sampled = sampleForFixture(ctx, unit.laserChannels)
      if (sampled.length === 0) continue
      const hardware = resolveLaserDacHardwareSettings(profile)
      contentKeyByProfile.set(
        profile.id,
        hardwareContentKey(
          profile.id,
          hardware,
          'scene',
          sceneContentRevision(ctx.scene, ctx.animProgress)
        )
      )
      const processed = applyHardwareForOutput(
        scalePower(sampled, hardware.outputPower01),
        hardware
      )
      if (processed.length > 0) {
        zoneFramesByProfile.set(profile.id, [
          {
            priority: 0,
            zoneIndex: 0,
            points: processed,
          },
        ])
      }
    }
  }

  const dacComposites: DacCompositePush[] = []
  for (const [profileId, entries] of zoneFramesByProfile) {
    const sorted = [...entries].sort((a, b) => a.priority - b.priority)
    const profile = profileById.get(profileId)
    const sessionId = dacSessionId(profileId)
    const scanRatePps = profile
      ? calibrationTestPatternProfileId === profileId
        ? resolveIldaTestPatternScanRatePps(
            resolveLaserDacHardwareSettings(profile).scanRatePps
          )
        : resolveLaserDacHardwareSettings(profile).scanRatePps
      : LASER_DAC_SCAN_RATE_DEFAULT_PPS
    const contentKey =
      contentKeyByProfile.get(profileId) ??
      hardwareContentKey(
        profileId,
        profile
          ? resolveLaserDacHardwareSettings(profile)
          : resolveLaserDacHardwareSettings({}),
        calibrationTestPatternProfileId === profileId ? 'test_pattern' : 'scene'
      )
    if (profile?.backend === 'fb4') {
      dacComposites.push({
        sessionId,
        pointRatePps: scanRatePps,
        points: [],
        contentKey,
        zoneFrames: sorted.map((e) => ({
          zoneIndex: e.zoneIndex,
          points: e.points,
        })),
      })
    } else {
      dacComposites.push({
        sessionId,
        pointRatePps: scanRatePps,
        contentKey,
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
