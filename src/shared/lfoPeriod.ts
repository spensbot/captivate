/** Beat lengths offered by the LFO period control (up/down = double/halve). */
export const LFO_UI_PERIOD_OPTIONS = [
  0.25, 0.5, 1, 2, 4, 8, 16, 32,
] as const

export type LfoUiPeriod = (typeof LFO_UI_PERIOD_OPTIONS)[number]

/** Matches {@link setPeriod} in controlSlice — 1/8-beat grid. */
export function quantizeBeatEighth(value: number): number {
  const safe = Number.isFinite(value) ? value : 0.25
  return Math.round(safe * 8) / 8
}

export function quantizePhaseShiftToBeatEighth(
  phaseShift: number,
  period: number
): number {
  const safePeriod = Math.max(0.25, Number.isFinite(period) ? period : 4)
  const phaseStep = 1 / (safePeriod * 8)
  const safePhase = clamp01(phaseShift)
  return clamp01(Math.round(safePhase / phaseStep) * phaseStep)
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** Snap any beat count to the nearest LFO period control option. */
export function snapLfoPeriodToUi(value: number): LfoUiPeriod {
  const clamped = Math.max(0.25, Math.min(32, value))
  let best: LfoUiPeriod = LFO_UI_PERIOD_OPTIONS[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (const option of LFO_UI_PERIOD_OPTIONS) {
    const dist = Math.abs(option - clamped)
    if (dist < bestDist) {
      bestDist = dist
      best = option
    }
  }
  return best
}

export function halfLfoPeriod(period: number): LfoUiPeriod {
  return snapLfoPeriodToUi(period / 2)
}

export function doubleLfoPeriod(period: number): LfoUiPeriod {
  return snapLfoPeriodToUi(period * 2)
}
