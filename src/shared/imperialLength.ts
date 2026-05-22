/** Parse stage length strings into decimal **feet**. Supports plain decimals and ft/inch forms. */

const INCHES_PER_FOOT = 12

/**
 * Accepts examples:
 * - `10`, `10.25` (decimal feet)
 * - `5'` (feet only)
 * - `1' - 10"`, `1'-10"`, `1' 10"` (feet + inches)
 * - `10 1/2`, `10-1/2` (mixed number feet, no quote marks)
 * - `1/2`, `15/16` (fraction of a foot)
 */
export function parseImperialLengthToDecimalFeet(raw: string): number | null {
  let s = raw.trim()
  if (s.length === 0) return null

  s = s.replace(/′/g, "'").replace(/″/g, '"').replace(/[–—]/g, '-')
  s = s.replace(/\bfeet\b/gi, ' ').replace(/\bft\b/gi, ' ')

  // Decimal feet only (no quote marks)
  if (!/['"]/.test(s) && /^-?\d+(\.\d+)?$/.test(s.trim())) {
    const n = Number(s.trim())
    return Number.isFinite(n) ? n : null
  }

  // Mixed number in feet (no ft/inch marks): 10 1/2, 10-1/2 → 10.5 ft
  const wholePlusFootFrac = s.match(
    /^(-?\d+)\s*(?:[-–—]\s*)?(\d+)\s*\/\s*(\d+)\s*$/i
  )
  if (wholePlusFootFrac && !/['"]/.test(s)) {
    const whole = Number(wholePlusFootFrac[1])
    const num = Number(wholePlusFootFrac[2])
    const den = Number(wholePlusFootFrac[3])
    if (
      Number.isFinite(whole) &&
      Number.isFinite(num) &&
      Number.isFinite(den) &&
      den !== 0
    ) {
      return whole + num / den
    }
  }

  // Pure foot fraction: 1/2, 15/16
  const footFracOnly = s.match(/^(-?\d+)\s*\/\s*(\d+)\s*$/)
  if (footFracOnly && !/['"]/.test(s)) {
    const num = Number(footFracOnly[1])
    const den = Number(footFracOnly[2])
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den
    }
  }

  // Inches-only: 10", 10 in
  const inchOnly = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:"|in(?:ches?)?)\s*$/i)
  if (inchOnly) {
    const inches = Number(inchOnly[1])
    if (!Number.isFinite(inches)) return null
    return inches / INCHES_PER_FOOT
  }

  // Feet only: 5', 2.5'
  const feetOnly = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*['']\s*$/)
  if (feetOnly) {
    const ft = Number(feetOnly[1])
    return Number.isFinite(ft) ? ft : null
  }

  // Feet with inches: 1' - 10", 1'-10", 1'10", 2.5' 6"
  const combined = s.match(
    /^(-?\d+(?:\.\d+)?)\s*['']\s*(?:[-–—]\s*)?(\d+(?:\.\d+)?)\s*['"]?\s*$/i
  )
  if (combined) {
    const ft = Number(combined[1])
    const inchPart = combined[2]
    if (!Number.isFinite(ft)) return null
    if (inchPart !== undefined && inchPart !== '') {
      const inches = Number(inchPart)
      if (!Number.isFinite(inches)) return null
      return ft + inches / INCHES_PER_FOOT
    }
    return ft
  }

  // Loose fallback: first number as feet
  const loose = parseFloat(s.replace(/[^\d.-]+/g, ' '))
  return Number.isFinite(loose) ? loose : null
}

export function clampImperialFeet(
  feet: number,
  min?: number,
  max?: number
): number {
  if (!Number.isFinite(feet)) return min ?? 0
  let v = feet
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return v
}

/** Display decimal feet as `ft' in"` (inches rounded to nearest 1/16). */
export function formatDecimalFeetAsFtIn(decimalFeet: number): string {
  if (!Number.isFinite(decimalFeet)) {
    return ''
  }
  const sign = decimalFeet < 0 ? '-' : ''
  const v = Math.abs(decimalFeet)
  const wholeFt = Math.floor(v + 1e-9)
  const totalInches = (v - wholeFt) * INCHES_PER_FOOT
  const totalInchesR = Math.round(totalInches * 16) / 16
  if (totalInchesR >= 12 - 1e-4) {
    return formatDecimalFeetAsFtIn((sign === '-' ? -1 : 1) * (wholeFt + 1))
  }
  if (totalInchesR <= 1 / 32) {
    return `${sign}${wholeFt}'`
  }
  if (Math.abs(totalInchesR - Math.round(totalInchesR)) < 1e-5) {
    return `${sign}${wholeFt}' ${Math.round(totalInchesR)}"`
  }
  const inchWhole = Math.floor(totalInchesR + 1e-9)
  const frac16 = Math.round((totalInchesR - inchWhole) * 16)
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(frac16, 16)
  const n = frac16 / g
  const d = 16 / g
  if (inchWhole <= 0) {
    return `${sign}${wholeFt}' ${n}/${d}"`
  }
  return `${sign}${wholeFt}' ${inchWhole} ${n}/${d}"`
}
