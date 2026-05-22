import { nanoid } from 'nanoid'
import { distanceBetween, pLerp, Point } from '../math/point'
import { BaseColors, getBaseColorsFromHsv } from './baseColors'
import { getMovingWindow, getWindowRandomizerLevel } from './dmxUtil'
import { getParam, Params } from './params'
import type { RandomizerState } from './randomizer'
import { Window2D_t } from './window'
import { WledOutputMode } from './wledDiscovery'

export const MAX_LED_COUNT = 8192

const MIN_PIXEL_SPACING = 0.001
const MAX_PIXEL_SPACING = 0.25
const MIN_GRID_PIXELS = 1
const MAX_GRID_PIXELS = 100
const DEFAULT_CURVE_HANDLE = 0.04

export type WLedFixtureKind = 'string' | 'grid'
export type WLedStringDrawMode = 'freeform' | 'line' | 'polyline' | 'curve'
export type LedMappingViewMode = 'xy' | 'xz'
export interface LedCurveHandle {
  in: number
  out: number
}

interface WLedFixtureBase {
  type: 'WLed'
  id: string
  name: string
  groups: string[]
  mdns: string
  controller: WLedControllerRouting
  kind: WLedFixtureKind
  position: {
    x: number
    y: number
    z: number
  }
  rotation: {
    x: number
    y: number
    z: number
  }
}

export interface WLedControllerRouting {
  output_mode: WledOutputMode
  pixel_format: 'auto' | 'rgb' | 'rgbw'
  segment_id: number | null
  pixel_start: number
  pixel_count: number | null
}

export interface WLedStringFixture extends WLedFixtureBase {
  kind: 'string'
  led_count: number
  pixel_spacing: number
  // Selected drawing tool in the editor.
  draw_mode: WLedStringDrawMode
  points: Point[] // normalized 0..1
  // Per-segment draw mode for XY path. Index i applies to segment points[i] -> points[i+1].
  segment_modes?: WLedStringDrawMode[]
  // Per-node curve handle distances for XY path.
  curve_handles?: LedCurveHandle[]
  // Optional X/Z view path. `x` maps to stage X, `y` maps to stage Z.
  points_xz?: Point[]
  // Optional per-segment draw mode for X/Z path.
  segment_modes_xz?: WLedStringDrawMode[]
  // Optional per-node curve handles for X/Z path.
  curve_handles_xz?: LedCurveHandle[]
}

export interface WLedGridFixture extends WLedFixtureBase {
  kind: 'grid'
  rows: number
  columns: number
  pixel_pitch: number
  anchor: Point
  // Optional X/Z view anchor. `x` maps to stage X, `y` maps to stage Z.
  anchor_xz?: Point
  serpentine: boolean
}

export type LedFixture = WLedStringFixture | WLedGridFixture

export function initLedFixture(): LedFixture {
  return {
    type: 'WLed',
    id: nanoid(),
    name: 'Name',
    groups: ['LEDs'],
    mdns: '',
    controller: {
      output_mode: 'auto',
      pixel_format: 'auto',
      segment_id: null,
      pixel_start: 0,
      pixel_count: null,
    },
    kind: 'string',
    position: {
      x: 0.5,
      y: 0.5,
      z: 1,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    led_count: 100,
    pixel_spacing: 0.01,
    draw_mode: 'polyline',
    points: [{ x: 0.5, y: 0.5 }],
    segment_modes: [],
    curve_handles: [{ in: 0.04, out: 0.04 }],
    points_xz: [{ x: 0.5, y: 0.5 }],
    segment_modes_xz: [],
    curve_handles_xz: [{ in: 0.04, out: 0.04 }],
  }
}

export function getLedFixturePixelCount(ledFixture: LedFixture): number {
  if (ledFixture.kind === 'grid') {
    const rows = clampInt(ledFixture.rows, 10, MIN_GRID_PIXELS, MAX_GRID_PIXELS)
    const columns = clampInt(
      ledFixture.columns,
      10,
      MIN_GRID_PIXELS,
      MAX_GRID_PIXELS
    )
    return Math.min(MAX_LED_COUNT, rows * columns)
  }

  return clampInt(ledFixture.led_count, 100, 1, MAX_LED_COUNT)
}

export interface LedStringPlacementStats {
  pathLength: number
  requiredLength: number
  ledsPlaced: number
  ledsRemaining: number
  lengthRemaining: number
  isComplete: boolean
}

export type LedRandomizerContext = {
  state: RandomizerState
  baseIndex: number
}

export function getLedValues(
  params: Params,
  ledFixture: LedFixture,
  master: number,
  placementDepth2DOnly: boolean = false,
  randomizer?: LedRandomizerContext
): BaseColors[] {
  const ledWindows = getLedWindows(ledFixture)
  if (ledWindows.length === 0) {
    return []
  }

  const hue = getParam(params, 'hue')
  const saturation = getParam(params, 'saturation')
  const brightness = getParam(params, 'brightness')
  const movingWindow = getMovingWindow(params, placementDepth2DOnly)

  return ledWindows.map((ledWindow, pixelIndex) => {
    const randomizerLevel =
      randomizer?.state[randomizer.baseIndex + pixelIndex]?.level ?? 1
    const windowMultiplier = getWindowRandomizerLevel(
      params,
      randomizerLevel,
      ledWindow,
      movingWindow
    )

    return getBaseColorsFromHsv(
      hue,
      saturation,
      brightness * windowMultiplier * master
    )
  })
}

export function getLedPointLayout(ledFixture: LedFixture): Point[] {
  return getLedPointLayoutForView(ledFixture, 'xy')
}

export function getLedPointLayoutForView(
  ledFixture: LedFixture,
  viewMode: LedMappingViewMode
): Point[] {
  if (ledFixture.kind === 'grid') {
    return getGridPoints(ledFixture, viewMode)
  }
  return getStringPoints(ledFixture, viewMode)
}

export function getLedStringPreviewPathForView(
  ledFixture: WLedStringFixture,
  viewMode: LedMappingViewMode
): Point[] {
  const pathPoints = normalizeStringPathPoints(ledFixture, viewMode)
  if (pathPoints.length < 2) {
    return pathPoints
  }
  const segmentModes = normalizeStringSegmentModes(ledFixture, viewMode, pathPoints.length)
  const curveHandles = normalizeStringCurveHandles(ledFixture, viewMode, pathPoints.length)
  return buildSamplePath(pathPoints, segmentModes, curveHandles)
}

export function getLedPointLayout3D(
  ledFixture: LedFixture
): Array<{ x: number; y: number; z: number }> {
  const xy = getLedPointLayoutForView(ledFixture, 'xy')
  const xz = getLedPointLayoutForView(ledFixture, 'xz')
  // Keep model indexing aligned with WLED output indexing (which is based on XY layout).
  const count = xy.length > 0 ? xy.length : xz.length
  const result: Array<{ x: number; y: number; z: number }> = []
  for (let i = 0; i < count; i++) {
    const pxy = xy[Math.min(i, Math.max(0, xy.length - 1))]
    const pxz = xz[Math.min(i, Math.max(0, xz.length - 1))]
    if (pxy === undefined && pxz === undefined) {
      continue
    }
    result.push({
      x: pxy?.x ?? pxz?.x ?? 0.5,
      y: pxy?.y ?? 0.5,
      z: pxz?.y ?? 0.5,
    })
  }
  return result
}

function getLedWindows(ledFixture: LedFixture): Window2D_t[] {
  return getLedPointLayout(ledFixture).map((point) => {
    return {
      x: {
        pos: clamp01(point.x, 0.5),
        width: 0,
      },
      y: {
        pos: clamp01(point.y, 0.5),
        width: 0,
      },
    }
  })
}

function getGridPoints(
  ledFixture: WLedGridFixture,
  viewMode: LedMappingViewMode
): Point[] {
  const rows = clampInt(ledFixture.rows, 10, MIN_GRID_PIXELS, MAX_GRID_PIXELS)
  const columns = clampInt(ledFixture.columns, 10, MIN_GRID_PIXELS, MAX_GRID_PIXELS)
  const pitch = clampNumber(
    ledFixture.pixel_pitch,
    0.02,
    MIN_PIXEL_SPACING,
    MAX_PIXEL_SPACING
  )
  const selectedAnchor =
    viewMode === 'xz'
      ? ledFixture.anchor_xz ?? ledFixture.anchor
      : ledFixture.anchor
  const anchor = {
    x: clamp01(selectedAnchor?.x, 0.5),
    y: clamp01(selectedAnchor?.y, 0.5),
  }

  const points: Point[] = []
  for (let row = 0; row < rows; row++) {
    const rowPoints: Point[] = []
    for (let column = 0; column < columns; column++) {
      const x = clamp01(anchor.x + column * pitch, anchor.x)
      const y = clamp01(anchor.y - row * pitch, anchor.y)
      rowPoints.push({ x, y })
    }
    if (ledFixture.serpentine && row % 2 === 1) {
      rowPoints.reverse()
    }
    points.push(...rowPoints)
    if (points.length >= MAX_LED_COUNT) {
      return points.slice(0, MAX_LED_COUNT)
    }
  }

  return points
}

function getStringPoints(
  ledFixture: WLedStringFixture,
  viewMode: LedMappingViewMode
): Point[] {
  const ledCount = clampInt(ledFixture.led_count, 100, 1, MAX_LED_COUNT)
  const pathPoints = normalizeStringPathPoints(ledFixture, viewMode)
  const segmentModes = normalizeStringSegmentModes(ledFixture, viewMode, pathPoints.length)
  const curveHandles = normalizeStringCurveHandles(ledFixture, viewMode, pathPoints.length)
  const spacing = clampNumber(
    ledFixture.pixel_spacing,
    0.01,
    MIN_PIXEL_SPACING,
    MAX_PIXEL_SPACING
  )

  if (pathPoints.length === 0) {
    return []
  }
  if (pathPoints.length === 1 || ledCount <= 1) {
    return Array(ledCount)
      .fill(null)
      .map(() => ({ ...pathPoints[0] }))
  }

  const sampledPath = buildSamplePath(pathPoints, segmentModes, curveHandles)
  const segments = pointsToSegments(sampledPath)
  const totalLength = segments.reduce((acc, segment) => acc + segment.length, 0)
  if (segments.length === 0 || totalLength <= 0.00001) {
    return Array(ledCount)
      .fill(null)
      .map(() => ({ ...pathPoints[0] }))
  }

  const tail = { ...segments[segments.length - 1].p1 }
  return Array(ledCount)
    .fill(null)
    .map((_v, ledIndex) => {
      const distance = ledIndex * spacing
      if (distance > totalLength) {
        return tail
      }
      return pointAlongSegments(segments, distance)
    })
}

export function getLedStringPlacementStats(
  ledFixture: WLedStringFixture
): LedStringPlacementStats {
  const ledCount = clampInt(ledFixture.led_count, 100, 1, MAX_LED_COUNT)
  const spacing = clampNumber(
    ledFixture.pixel_spacing,
    0.01,
    MIN_PIXEL_SPACING,
    MAX_PIXEL_SPACING
  )
  const pathPoints = normalizeStringPathPoints(ledFixture, 'xy')
  const segmentModes = normalizeStringSegmentModes(ledFixture, 'xy', pathPoints.length)
  const curveHandles = normalizeStringCurveHandles(ledFixture, 'xy', pathPoints.length)
  if (pathPoints.length < 2 || ledCount <= 1) {
    return {
      pathLength: 0,
      requiredLength: Math.max(0, (ledCount - 1) * spacing),
      ledsPlaced: Math.min(ledCount, 1),
      ledsRemaining: Math.max(0, ledCount - 1),
      lengthRemaining: Math.max(0, (ledCount - 1) * spacing),
      isComplete: ledCount <= 1,
    }
  }

  const sampledPath = buildSamplePath(pathPoints, segmentModes, curveHandles)
  const segments = pointsToSegments(sampledPath)
  const pathLength = segments.reduce((acc, segment) => acc + segment.length, 0)
  const requiredLength = Math.max(0, (ledCount - 1) * spacing)
  const spansCovered = Math.max(0, Math.floor(pathLength / spacing))
  const ledsPlaced = Math.min(ledCount, spansCovered + 1)
  const ledsRemaining = Math.max(0, ledCount - ledsPlaced)
  const lengthRemaining = Math.max(0, requiredLength - pathLength)

  return {
    pathLength,
    requiredLength,
    ledsPlaced,
    ledsRemaining,
    lengthRemaining,
    isComplete: ledsRemaining === 0,
  }
}

function normalizeStringPathPoints(
  ledFixture: WLedStringFixture,
  viewMode: LedMappingViewMode
): Point[] {
  const sourcePoints =
    viewMode === 'xz'
      ? Array.isArray(ledFixture.points_xz) && ledFixture.points_xz.length > 0
        ? ledFixture.points_xz
        : Array.isArray(ledFixture.points)
        ? ledFixture.points.map((point) => ({
            x: clamp01(point?.x, 0.5),
            y: 0.5,
          }))
        : [{ x: 0.5, y: 0.5 }]
      : ledFixture.points

  const normalized =
    Array.isArray(sourcePoints) && sourcePoints.length > 0
      ? sourcePoints.map((point) => ({
          x: clamp01(point?.x, 0.5),
          y: clamp01(point?.y, 0.5),
        }))
      : [{ x: 0.5, y: 0.5 }]

  return normalized
}

function normalizeStringSegmentModes(
  ledFixture: WLedStringFixture,
  viewMode: LedMappingViewMode,
  pointCount: number
): WLedStringDrawMode[] {
  if (pointCount < 2) {
    return []
  }
  const expectedLength = pointCount - 1
  const source =
    viewMode === 'xy'
      ? ledFixture.segment_modes
      : ledFixture.segment_modes_xz ?? ledFixture.segment_modes
  const fallbackMode = ledFixture.draw_mode ?? 'polyline'
  const output: WLedStringDrawMode[] = []
  for (let i = 0; i < expectedLength; i++) {
    output.push(
      toDrawMode(source?.[i]) ??
        toDrawMode(source?.[Math.max(0, (source?.length ?? 1) - 1)]) ??
        fallbackMode
    )
  }
  return output
}

function normalizeStringCurveHandles(
  ledFixture: WLedStringFixture,
  viewMode: LedMappingViewMode,
  pointCount: number
): LedCurveHandle[] {
  if (pointCount <= 0) {
    return []
  }

  const source =
    viewMode === 'xy'
      ? ledFixture.curve_handles
      : ledFixture.curve_handles_xz ?? ledFixture.curve_handles
  const output: LedCurveHandle[] = []
  for (let i = 0; i < pointCount; i++) {
    const candidate = source?.[i]
    output.push({
      in: clampCurveHandle(candidate?.in),
      out: clampCurveHandle(candidate?.out),
    })
  }
  return output
}

function buildSamplePath(
  points: Point[],
  segmentModes: WLedStringDrawMode[],
  curveHandles: LedCurveHandle[]
): Point[] {
  if (points.length < 2) {
    return points
  }

  const sampled: Point[] = [{ ...points[0] }]
  const subdivisions = 14
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    const segmentMode = segmentModes[i] ?? 'polyline'
    if (segmentMode === 'freeform') {
      const previous = points[Math.max(0, i - 1)]
      const next = points[Math.min(points.length - 1, i + 2)]
      const freeformSubdivisions = 8
      for (let step = 1; step <= freeformSubdivisions; step++) {
        const t = step / freeformSubdivisions
        sampled.push(
          catmullRomPoint(previous, start, end, next, t)
        )
      }
      continue
    }
    if (segmentMode !== 'curve') {
      sampled.push({ ...end })
      continue
    }

    const previous = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 2)]
    const startHandle = curveHandles[i] ?? {
      in: DEFAULT_CURVE_HANDLE,
      out: DEFAULT_CURVE_HANDLE,
    }
    const endHandle = curveHandles[i + 1] ?? {
      in: DEFAULT_CURVE_HANDLE,
      out: DEFAULT_CURVE_HANDLE,
    }
    const tangentStart = normalizeVector({
      x: end.x - previous.x,
      y: end.y - previous.y,
    })
    const tangentEnd = normalizeVector({
      x: next.x - start.x,
      y: next.y - start.y,
    })

    const c1 = {
      x: start.x + tangentStart.x * startHandle.out,
      y: start.y + tangentStart.y * startHandle.out,
    }
    const c2 = {
      x: end.x - tangentEnd.x * endHandle.in,
      y: end.y - tangentEnd.y * endHandle.in,
    }

    for (let step = 1; step <= subdivisions; step++) {
      const t = step / subdivisions
      sampled.push(cubicBezierPoint(start, c1, c2, end, t))
    }
  }
  return sampled
}

function catmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const safeT = Math.min(1, Math.max(0, t))
  const t2 = safeT * safeT
  const t3 = t2 * safeT

  const x =
    0.5 *
    ((2 * p1.x) +
      (-p0.x + p2.x) * safeT +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
  const y =
    0.5 *
    ((2 * p1.y) +
      (-p0.y + p2.y) * safeT +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

  return {
    x: clamp01(x, p1.x),
    y: clamp01(y, p1.y),
  }
}

function pointAlongSegments(segments: Segment[], targetDistance: number): Point {
  let remaining = targetDistance
  for (const segment of segments) {
    if (segment.length <= 0.000001) continue
    if (remaining <= segment.length) {
      const ratio = remaining / segment.length
      return pLerp(segment.p0, segment.p1, ratio)
    }
    remaining -= segment.length
  }

  const tail = segments[segments.length - 1]
  return { ...tail.p1 }
}

function cubicBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t
  const t3 = t2 * t

  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const x =
    mt3 * p0.x +
    3 * mt2 * t * p1.x +
    3 * mt * t2 * p2.x +
    t3 * p3.x
  const y =
    mt3 * p0.y +
    3 * mt2 * t * p1.y +
    3 * mt * t2 * p2.y +
    t3 * p3.y

  return {
    x: clamp01(x, p0.x),
    y: clamp01(y, p0.y),
  }
}

function normalizeVector(vec: Point): Point {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y)
  if (length <= 0.000001) {
    return { x: 1, y: 0 }
  }
  return {
    x: vec.x / length,
    y: vec.y / length,
  }
}

function clampCurveHandle(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CURVE_HANDLE
  }
  return Math.min(0.5, Math.max(0, numeric))
}

function toDrawMode(value: unknown): WLedStringDrawMode | null {
  if (
    value === 'freeform' ||
    value === 'line' ||
    value === 'polyline' ||
    value === 'curve'
  ) {
    return value
  }
  return null
}

function clamp01(value: unknown, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(0, numeric))
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function normalizeSegmentModesArray(
  source: unknown,
  pointCount: number,
  fallbackMode: WLedStringDrawMode
): WLedStringDrawMode[] {
  if (pointCount < 2) {
    return []
  }
  const array = Array.isArray(source) ? source : []
  const output: WLedStringDrawMode[] = []
  for (let i = 0; i < pointCount - 1; i++) {
    output.push(
      toDrawMode(array[i]) ??
        toDrawMode(array[Math.max(0, array.length - 1)]) ??
        fallbackMode
    )
  }
  return output
}

function normalizeCurveHandlesArray(
  source: unknown,
  pointCount: number
): LedCurveHandle[] {
  if (pointCount <= 0) {
    return []
  }
  const array = Array.isArray(source) ? source : []
  const output: LedCurveHandle[] = []
  for (let i = 0; i < pointCount; i++) {
    const candidate = array[i] as LedCurveHandle | undefined
    output.push({
      in: clampCurveHandle(candidate?.in),
      out: clampCurveHandle(candidate?.out),
    })
  }
  return output
}

export function normalizeLedFixtureForRuntime(ledFixture: LedFixture): LedFixture {
  const normalizedId =
    typeof ledFixture.id === 'string' && ledFixture.id.trim().length > 0
      ? ledFixture.id
      : nanoid()

  if (ledFixture.kind === 'grid') {
    return {
      ...ledFixture,
      id: normalizedId,
      rows: clampInt(ledFixture.rows, 10, MIN_GRID_PIXELS, MAX_GRID_PIXELS),
      columns: clampInt(ledFixture.columns, 10, MIN_GRID_PIXELS, MAX_GRID_PIXELS),
      pixel_pitch: clampNumber(
        ledFixture.pixel_pitch,
        0.02,
        MIN_PIXEL_SPACING,
        MAX_PIXEL_SPACING
      ),
      anchor: {
        x: clamp01(ledFixture.anchor?.x, 0.5),
        y: clamp01(ledFixture.anchor?.y, 0.5),
      },
      anchor_xz: {
        x: clamp01((ledFixture.anchor_xz ?? ledFixture.anchor)?.x, 0.5),
        y: clamp01((ledFixture.anchor_xz ?? ledFixture.anchor)?.y, 0.5),
      },
      mdns: ledFixture.mdns.trim(),
      controller: normalizeControllerRouting(ledFixture.controller),
      groups: ensureDefaultLedGroups(ledFixture.groups),
    }
  }

  return {
    ...ledFixture,
    id: normalizedId,
    led_count: clampInt(ledFixture.led_count, 100, 1, MAX_LED_COUNT),
    pixel_spacing: clampNumber(
      ledFixture.pixel_spacing,
      0.01,
      MIN_PIXEL_SPACING,
      MAX_PIXEL_SPACING
    ),
    points:
      Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.map((point) => ({
            x: clamp01(point?.x, 0.5),
            y: clamp01(point?.y, 0.5),
          }))
        : [{ x: 0.5, y: 0.5 }],
    points_xz:
      Array.isArray(ledFixture.points_xz) && ledFixture.points_xz.length > 0
        ? ledFixture.points_xz.map((point) => ({
            x: clamp01(point?.x, 0.5),
            y: clamp01(point?.y, 0.5),
          }))
        : Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.map((point) => ({
            x: clamp01(point?.x, 0.5),
            y: 0.5,
          }))
        : [{ x: 0.5, y: 0.5 }],
    draw_mode: toDrawMode(ledFixture.draw_mode) ?? 'polyline',
    segment_modes: normalizeSegmentModesArray(
      ledFixture.segment_modes,
      Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.length
        : 1,
      toDrawMode(ledFixture.draw_mode) ?? 'polyline'
    ),
    segment_modes_xz: normalizeSegmentModesArray(
      ledFixture.segment_modes_xz ?? ledFixture.segment_modes,
      Array.isArray(ledFixture.points_xz) && ledFixture.points_xz.length > 0
        ? ledFixture.points_xz.length
        : Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.length
        : 1,
      toDrawMode(ledFixture.draw_mode) ?? 'polyline'
    ),
    curve_handles: normalizeCurveHandlesArray(
      ledFixture.curve_handles,
      Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.length
        : 1
    ),
    curve_handles_xz: normalizeCurveHandlesArray(
      ledFixture.curve_handles_xz ?? ledFixture.curve_handles,
      Array.isArray(ledFixture.points_xz) && ledFixture.points_xz.length > 0
        ? ledFixture.points_xz.length
        : Array.isArray(ledFixture.points) && ledFixture.points.length > 0
        ? ledFixture.points.length
        : 1
    ),
    mdns: ledFixture.mdns.trim(),
    controller: normalizeControllerRouting(ledFixture.controller),
    groups: ensureDefaultLedGroups(ledFixture.groups),
  }
}

function normalizeControllerRouting(
  routing: WLedControllerRouting | undefined
): WLedControllerRouting {
  const outputMode = normalizeOutputMode(routing?.output_mode)
  const segmentIdRaw = routing?.segment_id
  const segmentId =
    segmentIdRaw === null || segmentIdRaw === undefined
      ? null
      : clampInt(segmentIdRaw, 0, 0, 9999)
  const pixelStart = clampInt(routing?.pixel_start, 0, 0, 1000000)
  const pixelCountRaw = routing?.pixel_count
  const pixelCount =
    pixelCountRaw === null || pixelCountRaw === undefined
      ? null
      : clampInt(pixelCountRaw, 1, 1, 1000000)

  return {
    output_mode: outputMode,
    pixel_format:
      routing?.pixel_format === 'rgb' || routing?.pixel_format === 'rgbw'
        ? routing.pixel_format
        : 'auto',
    segment_id: segmentId,
    pixel_start: pixelStart,
    pixel_count: pixelCount,
  }
}

function normalizeOutputMode(value: unknown): WledOutputMode {
  if (value === 'pixel' || value === 'pwm3' || value === 'pwm4') {
    return value
  }
  return 'auto'
}

function ensureDefaultLedGroups(groups: string[]): string[] {
  const deduped = dedupeGroups(groups)
  if (deduped.length === 0) {
    return ['LEDs']
  }
  return deduped
}

function dedupeGroups(groups: string[]): string[] {
  const output: string[] = []
  const seen = new Set<string>()
  for (const value of groups) {
    const raw = typeof value === 'string' ? value.trim() : ''
    const next =
      raw.toLowerCase() === 'pixels'
        ? 'LEDs'
        : raw
    if (next.length === 0 || seen.has(next)) continue
    seen.add(next)
    output.push(next)
  }
  return output
}

interface Segment {
  p0: Point
  p1: Point
  length: number
}

function pointsToSegments(points: Point[]): Segment[] {
  if (points.length < 2) return []

  let last = points[0]
  return points.slice(1).map((p) => {
    const segment: Segment = {
      p0: last,
      p1: p,
      length: distanceBetween(p, last),
    }
    last = p
    return segment
  })
}
