import { Normalized, getBaseLog, lerp } from './util'
import { Point, point } from './point'
import { cubicBezier, findYForX, skewBezier } from './bezier'
import { Range, rUnlerp, range } from './range'

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
// ========== BEZIER SKEW =================

const start: Readonly<Point> = {
  x: 0,
  y: 0,
}
const end: Readonly<Point> = {
  x: 1,
  y: 1,
}

export const skewBezier1: SkewFn = (val, skew) => {
  const mapped = map(skew)
  if (mapped < 0) {
    return skewBezierDown(val, -mapped)
  } else {
    return skewBezierUp(val, mapped)
  }
}

const skewBezierUp: SkewFn = (val, skew) => {
  const fn = (t: Normalized) =>
    cubicBezier(
      {
        start,
        handle1: point(0, skew),
        handle2: point(1 - skew, 1),
        end,
      },
      t
    )
  return findYForX(val, fn) // fn(val).y
}

const skewBezierDown: SkewFn = (val, skew) => {
  const fn = (t: Normalized) =>
    cubicBezier(
      {
        start,
        handle1: point(skew, 0),
        handle2: point(1, 1 - skew),
        end,
      },
      t
    )
  return findYForX(val, fn) //fn(val).y
}

export const skewBezier2: SkewFn = (val, skew) => {
  const mapped = map(skew)
  if (mapped < 0) {
    const fn = (t: Normalized) => skewBezier('down', -mapped, t)
    return findYForX(val, fn) // fn(val).y
  } else {
    const fn = (t: Normalized) => skewBezier('up', mapped, t)
    return findYForX(val, fn) // fn(val).y
  }
}

let N = 10
Array(N + 1)
  .fill(0)
  .forEach((_, i) => {
    let t = i / N / 2
    let res = skewBezier('up', 0.0, t)
    console.log(`t: ${t} | x: ${res.x.toFixed(2)} | y: ${res.y.toFixed(2)}`)
  })

// ========================================
// ========== POWER SKEW =================

function getPow(skew: Normalized) {
  const factor = getBaseLog(0.5, 0.099)
  return Math.pow(skew, factor) * 10 + 0.01
}

export const skewPower: SkewFn = (val, skew) => {
  // first, skew the normalized skew value so it ranges from 0 to 100
  const pow = getPow(skew)

  return Math.pow(val, pow)
}

export const skewPower2: SkewFn = (val, skew) => {
  const pow = getPow(skew)

  if (val < 0.25) {
    return lerpedPowPow(val, pow, range(0, 0.25), range(1, 1.3))
  } else if (val < 0.5) {
    return lerpedPowPow(val, pow, range(0.25, 0.5), range(1.3, 1.6))
  } else if (val < 0.75) {
    return lerpedPowPow(val, pow, range(0.5, 0.75), range(1.6, 1.9))
  } else {
    return lerpedPowPow(val, pow, range(0.75, 1), range(1.9, 2.2))
  }
}

function lerpedPowPow(val: number, pow: number, valR: Range, pow2R: Range) {
  const a = Math.pow(val, Math.pow(pow, pow2R.min))
  const b = Math.pow(val, Math.pow(pow, pow2R.max))
  return lerp(a, b, rUnlerp(valR, val))
}

export const skewPower3: SkewFn = (val, skew) => {
  const pow = getPow(skew)

  return Math.pow(val, Math.pow(pow, lerp(1, 3, val)))
}

export function unSkewPower(skewed: Normalized, skew: Normalized) {
  const pow = getPow(skew)

  return Math.pow(skewed, 1 / pow)
}
