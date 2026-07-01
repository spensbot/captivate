/** How RGB laser modulation is sent to the DAC (analog 0–255 vs TTL on/off). */
export type LaserColorOutputMode = 'analog' | 'ttl'

/**
 * Projector size/position calibration (matches QuickShow / LaserShowGen style controls).
 * Applied around the canvas center before zone mapping.
 */
export type LaserDacCalibration = {
  /** Master projection size as percent of DAC field (25–100). */
  masterSizePct: number
  /** Horizontal size trim percent (50–150, 100 = match master). */
  sizeXPct: number
  /** Vertical size trim percent (50–150, 100 = match master). */
  sizeYPct: number
  /** Rotation in degrees around canvas center. */
  rotationDeg: number
  /** Horizontal position offset (normalized canvas units). */
  positionX: number
  /** Vertical position offset (normalized canvas units). */
  positionY: number
}

/** @deprecated Legacy persisted fields — migrated on load. */
type LegacyLaserDacCalibration = {
  driftX?: number
  driftY?: number
  scaleX?: number
  scaleY?: number
  rotationDeg?: number
  offsetX?: number
  offsetY?: number
}

export type LaserDacHardwareSettings = {
  colorMode: LaserColorOutputMode
  /** Scanner point rate in points per second (pps). */
  scanRatePps: number
  /** Global output intensity 0–1 applied to RGB samples. */
  outputPower01: number
  calibration: LaserDacCalibration
}

export const LASER_DAC_SCAN_RATE_MIN_PPS = 1000
export const LASER_DAC_SCAN_RATE_MAX_PPS = 100000
export const LASER_DAC_SCAN_RATE_DEFAULT_PPS = 30000

export const LASER_DAC_OUTPUT_POWER_DEFAULT = 0.75

export const LASER_CALIBRATION_MASTER_SIZE_MIN_PCT = 25
export const LASER_CALIBRATION_MASTER_SIZE_MAX_PCT = 100
export const LASER_CALIBRATION_MASTER_SIZE_DEFAULT_PCT = 80

export const LASER_CALIBRATION_SIZE_TRIM_MIN_PCT = 50
export const LASER_CALIBRATION_SIZE_TRIM_MAX_PCT = 150
export const LASER_CALIBRATION_SIZE_TRIM_DEFAULT_PCT = 100

export const LASER_CALIBRATION_POSITION_MAX = 0.25
export const LASER_CALIBRATION_ROTATION_MAX_DEG = 45

export function createDefaultLaserDacCalibration(): LaserDacCalibration {
  return {
    masterSizePct: LASER_CALIBRATION_MASTER_SIZE_DEFAULT_PCT,
    sizeXPct: LASER_CALIBRATION_SIZE_TRIM_DEFAULT_PCT,
    sizeYPct: LASER_CALIBRATION_SIZE_TRIM_DEFAULT_PCT,
    rotationDeg: 0,
    positionX: 0,
    positionY: 0,
  }
}

export function createDefaultLaserDacHardwareSettings(): LaserDacHardwareSettings {
  return {
    colorMode: 'analog',
    scanRatePps: LASER_DAC_SCAN_RATE_DEFAULT_PPS,
    outputPower01: LASER_DAC_OUTPUT_POWER_DEFAULT,
    calibration: createDefaultLaserDacCalibration(),
  }
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function migrateLegacyCalibration(
  o: LegacyLaserDacCalibration
): LaserDacCalibration {
  const base = createDefaultLaserDacCalibration()
  const scaleX = clampNum(o.scaleX, 0.5, 1.5, 1)
  const scaleY = clampNum(o.scaleY, 0.5, 1.5, 1)
  const avgScale = (scaleX + scaleY) / 2
  return {
    masterSizePct: clampNum(
      Math.round(avgScale * LASER_CALIBRATION_MASTER_SIZE_DEFAULT_PCT),
      LASER_CALIBRATION_MASTER_SIZE_MIN_PCT,
      LASER_CALIBRATION_MASTER_SIZE_MAX_PCT,
      base.masterSizePct
    ),
    sizeXPct: clampNum(
      Math.round((scaleX / avgScale) * 100),
      LASER_CALIBRATION_SIZE_TRIM_MIN_PCT,
      LASER_CALIBRATION_SIZE_TRIM_MAX_PCT,
      100
    ),
    sizeYPct: clampNum(
      Math.round((scaleY / avgScale) * 100),
      LASER_CALIBRATION_SIZE_TRIM_MIN_PCT,
      LASER_CALIBRATION_SIZE_TRIM_MAX_PCT,
      100
    ),
    rotationDeg: clampNum(
      o.rotationDeg,
      -LASER_CALIBRATION_ROTATION_MAX_DEG,
      LASER_CALIBRATION_ROTATION_MAX_DEG,
      0
    ),
    positionX: clampNum(
      (o.offsetX ?? 0) + (o.driftX ?? 0),
      -LASER_CALIBRATION_POSITION_MAX,
      LASER_CALIBRATION_POSITION_MAX,
      0
    ),
    positionY: clampNum(
      (o.offsetY ?? 0) + (o.driftY ?? 0),
      -LASER_CALIBRATION_POSITION_MAX,
      LASER_CALIBRATION_POSITION_MAX,
      0
    ),
  }
}

export function normalizeLaserDacCalibration(raw: unknown): LaserDacCalibration {
  const base = createDefaultLaserDacCalibration()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Partial<LaserDacCalibration> & LegacyLaserDacCalibration

  if (
    o.masterSizePct === undefined &&
    (o.scaleX !== undefined ||
      o.offsetX !== undefined ||
      o.driftX !== undefined)
  ) {
    return migrateLegacyCalibration(o)
  }

  return {
    masterSizePct: clampNum(
      o.masterSizePct,
      LASER_CALIBRATION_MASTER_SIZE_MIN_PCT,
      LASER_CALIBRATION_MASTER_SIZE_MAX_PCT,
      base.masterSizePct
    ),
    sizeXPct: clampNum(
      o.sizeXPct,
      LASER_CALIBRATION_SIZE_TRIM_MIN_PCT,
      LASER_CALIBRATION_SIZE_TRIM_MAX_PCT,
      base.sizeXPct
    ),
    sizeYPct: clampNum(
      o.sizeYPct,
      LASER_CALIBRATION_SIZE_TRIM_MIN_PCT,
      LASER_CALIBRATION_SIZE_TRIM_MAX_PCT,
      base.sizeYPct
    ),
    rotationDeg: clampNum(
      o.rotationDeg,
      -LASER_CALIBRATION_ROTATION_MAX_DEG,
      LASER_CALIBRATION_ROTATION_MAX_DEG,
      base.rotationDeg
    ),
    positionX: clampNum(
      o.positionX,
      -LASER_CALIBRATION_POSITION_MAX,
      LASER_CALIBRATION_POSITION_MAX,
      base.positionX
    ),
    positionY: clampNum(
      o.positionY,
      -LASER_CALIBRATION_POSITION_MAX,
      LASER_CALIBRATION_POSITION_MAX,
      base.positionY
    ),
  }
}

export function normalizeLaserDacHardwareSettings(
  raw: unknown
): LaserDacHardwareSettings {
  const base = createDefaultLaserDacHardwareSettings()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Partial<LaserDacHardwareSettings>
  return {
    colorMode: o.colorMode === 'ttl' ? 'ttl' : 'analog',
    scanRatePps: Math.round(
      clampNum(
        o.scanRatePps,
        LASER_DAC_SCAN_RATE_MIN_PPS,
        LASER_DAC_SCAN_RATE_MAX_PPS,
        base.scanRatePps
      )
    ),
    outputPower01: clampNum(o.outputPower01, 0, 1, base.outputPower01),
    calibration: normalizeLaserDacCalibration(o.calibration),
  }
}

export function resolveLaserDacHardwareSettings(
  profile: { hardwareSettings?: LaserDacHardwareSettings }
): LaserDacHardwareSettings {
  return normalizeLaserDacHardwareSettings(profile.hardwareSettings)
}
