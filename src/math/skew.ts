import { Normalized, getBaseLog, lerp } from './util'

// Skew Functions are transfer functions for a value from 0 to 1.
// skew < 0.5 => val decreases
// skew > 0.5 => val increases

type SkewFn = (val: Normalized, skew: Normalized) => Normalized

export function skewSymmetric(
  val: Normalized,
  skew: Normalized,
  skewFn: SkewFn
) {
  let mapped = map(val)
  if (mapped > 0) {
    mapped = skewFn(mapped, skew)
  } else {
    mapped = -skewFn(-mapped, skew)
  }
  return unMap(mapped)
}

// maps normalized val from -1 to 1
function map(val: Normalized) {
  return val * 2 - 1
}
function unMap(mapped: number) {
  return (mapped + 1) / 2
}

// ========================================
// ========== POWER SKEW =================

function getPow(skew: Normalized) {
  // map the normalized skew value so it ranges from 0 to MAX
  const MAX = 5
  const factor = getBaseLog(0.5, 1 / MAX)
  return Math.pow(skew, factor) * MAX
}

export const skewPower: SkewFn = (val, skew) => {
  const pow = getPow(skew)

  return Math.pow(val, pow)
}

export const skewPower3: SkewFn = (val, skew) => {
  const pow = getPow(skew)

  return Math.pow(val, Math.pow(pow, lerp(1, 3, val)))
}

export function unSkewPower(skewed: Normalized, skew: Normalized) {
  const pow = getPow(skew)

  return Math.pow(skewed, 1 / pow)
}
