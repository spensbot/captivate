/** Parse stage length strings into decimal **feet**. Supports plain decimals and ft/inch forms. */

const INCHES_PER_FOOT = 12

/**
 * Accepts examples:
 * - `10`, `10.25` (decimal feet)
 * - `5'` (feet only)
 * - `1' - 10"`, `1'-10"`, `1' 10"` (feet + inches)
 * - `10"` (inches only → feet)
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
