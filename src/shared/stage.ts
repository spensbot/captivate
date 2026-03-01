import { clampNormalized } from '../math/util'

export type StageUnit = 'ft' | 'm'
export type StageAxis = 'x' | 'y' | 'z'

export interface StageDimensions {
  unit: StageUnit
  widthFt: number
  heightFt: number
  depthFt: number
}

const MIN_STAGE_WIDTH_FT = 2
const MIN_STAGE_HEIGHT_FT = 2
const MIN_STAGE_DEPTH_FT = 2
const MAX_STAGE_WIDTH_FT = 400
const MAX_STAGE_HEIGHT_FT = 150
const MAX_STAGE_DEPTH_FT = 250

export const FEET_PER_METER = 3.280839895013123
export const METERS_PER_FOOT = 0.3048
export const STAGE_SNAP_GRID_FEET = 0.5

export function initStageDimensions(): StageDimensions {
  return {
    unit: 'ft',
    widthFt: 24,
    heightFt: 12,
    depthFt: 18,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function normalizeStageUnit(value: unknown): StageUnit {
  return value === 'm' ? 'm' : 'ft'
}

function normalizeStageFeet(value: unknown, fallback: number, axis: StageAxis): number {
  const next = Number(value)
  if (!Number.isFinite(next)) {
    return fallback
  }

  if (axis === 'x') {
    return clamp(next, MIN_STAGE_WIDTH_FT, MAX_STAGE_WIDTH_FT)
  }
  if (axis === 'y') {
    return clamp(next, MIN_STAGE_HEIGHT_FT, MAX_STAGE_HEIGHT_FT)
  }
  return clamp(next, MIN_STAGE_DEPTH_FT, MAX_STAGE_DEPTH_FT)
}

export function normalizeStageDimensions(raw: unknown): StageDimensions {
  const defaults = initStageDimensions()
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as {
    unit?: unknown
    widthFt?: unknown
    heightFt?: unknown
    depthFt?: unknown
    width?: unknown
    height?: unknown
    depth?: unknown
  }

  const unit = normalizeStageUnit(source.unit)
  const legacyWidth = Number(source.width)
  const legacyHeight = Number(source.height)
  const legacyDepth = Number(source.depth)
  const widthSource =
    source.widthFt !== undefined
      ? source.widthFt
      : Number.isFinite(legacyWidth)
      ? toFeet(legacyWidth, unit)
      : defaults.widthFt
  const heightSource =
    source.heightFt !== undefined
      ? source.heightFt
      : Number.isFinite(legacyHeight)
      ? toFeet(legacyHeight, unit)
      : defaults.heightFt
  const depthSource =
    source.depthFt !== undefined
      ? source.depthFt
      : Number.isFinite(legacyDepth)
      ? toFeet(legacyDepth, unit)
      : defaults.depthFt

  return {
    unit,
    widthFt: normalizeStageFeet(widthSource, defaults.widthFt, 'x'),
    heightFt: normalizeStageFeet(heightSource, defaults.heightFt, 'y'),
    depthFt: normalizeStageFeet(depthSource, defaults.depthFt, 'z'),
  }
}

export function toFeet(value: number, unit: StageUnit): number {
  if (!Number.isFinite(value)) return 0
  return unit === 'm' ? value * FEET_PER_METER : value
}

export function fromFeet(value: number, unit: StageUnit): number {
  if (!Number.isFinite(value)) return 0
  return unit === 'm' ? value * METERS_PER_FOOT : value
}

export function stageAxisLengthFt(stage: StageDimensions, axis: StageAxis): number {
  if (axis === 'x') return stage.widthFt
  if (axis === 'y') return stage.heightFt
  return stage.depthFt
}

export function stageAxisToFeet(
  stage: StageDimensions,
  axis: StageAxis,
  normalized: number
): number {
  const ratio = clampNormalized(normalized)
  const axisLengthFt = stageAxisLengthFt(stage, axis)
  if (axis === 'z') {
    // Z grows from stage edge (top of map) toward audience/front.
    return (1 - ratio) * axisLengthFt
  }
  return ratio * axisLengthFt
}

export function stageAxisFromFeet(
  stage: StageDimensions,
  axis: StageAxis,
  valueFt: number
): number {
  const axisLengthFt = Math.max(0.00001, stageAxisLengthFt(stage, axis))
  const ratio = clampNormalized(valueFt / axisLengthFt)
  return axis === 'z' ? 1 - ratio : ratio
}

export function stageAxisToDisplayValue(
  stage: StageDimensions,
  axis: StageAxis,
  normalized: number
): number {
  return fromFeet(stageAxisToFeet(stage, axis, normalized), stage.unit)
}

export function stageAxisFromDisplayValue(
  stage: StageDimensions,
  axis: StageAxis,
  displayValue: number
): number {
  return stageAxisFromFeet(stage, axis, toFeet(displayValue, stage.unit))
}

export function snapStageAxisNormalized(
  stage: StageDimensions,
  axis: StageAxis,
  normalized: number,
  snapFeet: number = STAGE_SNAP_GRID_FEET
): number {
  const safeSnapFeet = Math.max(0.001, Math.abs(snapFeet))
  const snappedFeet = Math.round(stageAxisToFeet(stage, axis, normalized) / safeSnapFeet) * safeSnapFeet
  return stageAxisFromFeet(stage, axis, snappedFeet)
}

