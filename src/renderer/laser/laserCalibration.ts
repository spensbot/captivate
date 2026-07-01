import type { LaserDacFramePoint } from '../../shared/laserDac'
import type {
  LaserColorOutputMode,
  LaserDacCalibration,
  LaserDacHardwareSettings,
} from '../../shared/laserHardwareSettings'

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

export function applyLaserCalibrationToPoint(
  point: LaserDacFramePoint,
  calibration: LaserDacCalibration
): LaserDacFramePoint {
  const master = calibration.masterSizePct / 100
  const sx = master * (calibration.sizeXPct / 100)
  const sy = master * (calibration.sizeYPct / 100)

  let x = point.x - 0.5
  let y = point.y - 0.5

  x *= sx
  y *= sy

  const rad = (calibration.rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = x * cos - y * sin
  const ry = x * sin + y * cos

  return {
    ...point,
    x: clamp01(rx + 0.5 + calibration.positionX),
    y: clamp01(ry + 0.5 + calibration.positionY),
  }
}

export function applyLaserCalibrationToFrame(
  points: LaserDacFramePoint[],
  calibration: LaserDacCalibration
): LaserDacFramePoint[] {
  if (
    calibration.masterSizePct === 100 &&
    calibration.sizeXPct === 100 &&
    calibration.sizeYPct === 100 &&
    calibration.rotationDeg === 0 &&
    calibration.positionX === 0 &&
    calibration.positionY === 0
  ) {
    return points
  }
  return points.map((p) => applyLaserCalibrationToPoint(p, calibration))
}

export function applyLaserColorModeToFrame(
  points: LaserDacFramePoint[],
  colorMode: LaserColorOutputMode
): LaserDacFramePoint[] {
  if (colorMode === 'analog') return points
  return points.map((p) => {
    if (p.blank) return p
    return {
      ...p,
      r: p.r > 0.5 ? 1 : 0,
      g: p.g > 0.5 ? 1 : 0,
      b: p.b > 0.5 ? 1 : 0,
    }
  })
}

export function applyLaserHardwareSettingsToFrame(
  points: LaserDacFramePoint[],
  settings: LaserDacHardwareSettings
): LaserDacFramePoint[] {
  const calibrated = applyLaserCalibrationToFrame(points, settings.calibration)
  return applyLaserColorModeToFrame(calibrated, settings.colorMode)
}
