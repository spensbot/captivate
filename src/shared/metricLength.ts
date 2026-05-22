/** Parse metric length strings into **meters**. Supports mm, cm, m and plain decimals (meters). */

export function parseMetricLengthToMeters(raw: string): number | null {
  let s = raw.trim()
  if (s.length === 0) return null

  s = s.replace(/\s+/g, ' ')
  if (/^\d+,\d/.test(s) || /^-\d+,\d/.test(s)) {
    s = s.replace(',', '.')
  }

  const mm = s.match(
    /^(-?\d+(?:\.\d+)?)\s*(?:mm|millimeters?|millimetres?)$/i
  )
  if (mm) {
    const v = Number(mm[1])
    return Number.isFinite(v) ? v / 1000 : null
  }

  const cm = s.match(
    /^(-?\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetres?)$/i
  )
  if (cm) {
    const v = Number(cm[1])
    return Number.isFinite(v) ? v / 100 : null
  }

  const mExplicit = s.match(
    /^(-?\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)$/i
  )
  if (mExplicit) {
    const v = Number(mExplicit[1])
    return Number.isFinite(v) ? v : null
  }

  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const v = Number(s)
    return Number.isFinite(v) ? v : null
  }

  const loose = parseFloat(s.replace(/[^\d.-]+/g, ''))
  return Number.isFinite(loose) ? loose : null
}

export function clampMetricMeters(
  meters: number,
  min?: number,
  max?: number
): number {
  if (!Number.isFinite(meters)) return min ?? 0
  let v = meters
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return v
}

export function formatMetricMetersForDraft(meters: number): string {
  if (!Number.isFinite(meters)) return ''
  const s = meters.toFixed(8).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/** Display meters as `m m cm` (centimeters rounded to 2 decimals when needed). */
export function formatMetersAsMetersCm(meters: number): string {
  if (!Number.isFinite(meters)) {
    return ''
  }
  const sign = meters < 0 ? '-' : ''
  const v = Math.abs(meters)
  const wholeM = Math.floor(v + 1e-9)
  const cmFloat = (v - wholeM) * 100
  const cmRounded = Math.round(cmFloat * 100) / 100
  if (cmRounded >= 100 - 1e-4) {
    return formatMetersAsMetersCm((sign === '-' ? -1 : 1) * (wholeM + 1))
  }
  if (cmRounded < 0.005) {
    return `${sign}${wholeM} m`
  }
  const cmStr =
    Math.abs(cmRounded - Math.round(cmRounded)) < 1e-5
      ? String(Math.round(cmRounded))
      : cmRounded.toFixed(2).replace(/\.?0+$/, '')
  return `${sign}${wholeM} m ${cmStr} cm`
}
