import type { LaserDacFramePoint } from '../../shared/laserDac'
import {
  ILDA_STANDARD_TEST_PATTERN_POINT_COUNT,
  ILDA_STANDARD_TEST_PATTERN_POINTS,
} from './laserIldaTestPatternData'

/** ILDA standard test pattern A (ildatest) — same file LaserShowGen uses. */
export type LaserCalibrationPatternKind = 'ilda_standard'

export type LaserCalibrationPatternSegment = {
  /** Normalized polyline in editor space (origin top-left, 0–1). */
  points: Array<{ x: number; y: number }>
  r: number
  g: number
  b: number
}

/** ILDA 12K / 30K standard rates for the official test pattern. */
export const ILDA_TEST_PATTERN_SCAN_RATE_12K_PPS = 12000
export const ILDA_TEST_PATTERN_SCAN_RATE_30K_PPS = 30000

/** @deprecated Use resolveIldaTestPatternScanRatePps() */
export const LASER_CALIBRATION_PATTERN_SCAN_PPS = ILDA_TEST_PATTERN_SCAN_RATE_12K_PPS

/** Max normalized distance between consecutive blank points (prevents streaks). */
const BLANK_HOP_MAX_STEP = 0.012
/** Blank dwell points before the beam turns on at a new location. */
const BLANK_BEFORE_LIT_DWELL = 8

/**
 * Map user scan rate to the ILDA-standard 12K or 30K rate (LaserShowGen / ILDA spec).
 */
export function resolveIldaTestPatternScanRatePps(scanRatePps: number): number {
  if (!Number.isFinite(scanRatePps)) return ILDA_TEST_PATTERN_SCAN_RATE_30K_PPS
  return scanRatePps <= 18000
    ? ILDA_TEST_PATTERN_SCAN_RATE_12K_PPS
    : ILDA_TEST_PATTERN_SCAN_RATE_30K_PPS
}

function blankPoint(x: number, y: number): LaserDacFramePoint {
  return { x, y, r: 0, g: 0, b: 0, blank: true }
}

/**
 * Insert blank points along long blank hops and add dwell before lit segments.
 * ILDA files assume slow blanking hardware; densifying prevents visible streaks.
 */
export function densifyIldaBlankHops(
  points: LaserDacFramePoint[]
): LaserDacFramePoint[] {
  if (points.length === 0) return points
  const out: LaserDacFramePoint[] = []

  for (const p of points) {
    if (out.length === 0) {
      out.push({ ...p })
      continue
    }

    const prev = out[out.length - 1]!
    const dx = p.x - prev.x
    const dy = p.y - prev.y
    const dist = Math.hypot(dx, dy)

    if (prev.blank && p.blank && dist > BLANK_HOP_MAX_STEP) {
      const steps = Math.ceil(dist / BLANK_HOP_MAX_STEP)
      for (let s = 1; s < steps; s++) {
        const t = s / steps
        out.push(blankPoint(prev.x + dx * t, prev.y + dy * t))
      }
    }

    if (prev.blank && !p.blank) {
      for (let i = 0; i < BLANK_BEFORE_LIT_DWELL; i++) {
        out.push(blankPoint(p.x, p.y))
      }
    } else if (!prev.blank && p.blank) {
      out.push(blankPoint(prev.x, prev.y))
    }

    out.push({ ...p })
  }

  return out
}

/** Raw ILDA test pattern points (blanking preserved from ildatest.ild). */
export function getIldaStandardTestPatternPoints(): LaserDacFramePoint[] {
  return ILDA_STANDARD_TEST_PATTERN_POINTS
}

/**
 * Split ILDA points into lit polylines for canvas preview (break on blank status).
 */
export function buildLaserCalibrationPatternSegments(
  kind: LaserCalibrationPatternKind = 'ilda_standard'
): LaserCalibrationPatternSegment[] {
  if (kind !== 'ilda_standard') return []
  const points = ILDA_STANDARD_TEST_PATTERN_POINTS
  const segments: LaserCalibrationPatternSegment[] = []
  let current: LaserCalibrationPatternSegment | null = null

  for (const p of points) {
    if (p.blank) {
      current = null
      continue
    }
    if (
      current === null ||
      current.r !== p.r ||
      current.g !== p.g ||
      current.b !== p.b
    ) {
      current = { points: [], r: p.r, g: p.g, b: p.b }
      segments.push(current)
    }
    current.points.push({ x: p.x, y: p.y })
  }

  return segments.filter((s) => s.points.length >= 2)
}

/**
 * Sample the ILDA standard test pattern for DAC output.
 * Uses pattern A (ildatest) with blank-hop densification for clean transitions.
 */
export function sampleLaserCalibrationPattern(
  _maxPointsUnused = 640,
  kind: LaserCalibrationPatternKind = 'ilda_standard'
): LaserDacFramePoint[] {
  void _maxPointsUnused
  if (kind !== 'ilda_standard') {
    return [
      { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
      { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
    ]
  }
  const points = densifyIldaBlankHops(
    ILDA_STANDARD_TEST_PATTERN_POINTS.map((p) => ({ ...p }))
  )
  if (points.length >= 2) return points
  return [
    { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
    { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
  ]
}

export function maxPointsForScanRate(scanRatePps: number): number {
  return Math.min(4095, Math.max(200, Math.round(scanRatePps / 8)))
}

export { ILDA_STANDARD_TEST_PATTERN_POINT_COUNT }
