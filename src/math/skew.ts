import { Normalized, getBaseLog } from './util'
import { Point, point } from './point'
import { cubicBezier, skewBezier } from './bezier'

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
  return cubicBezier(
    {
      start,
      handle1: point(0, skew),
      handle2: point(1 - skew, 1),
      end,
    },
    val
  ).y
}

const skewBezierDown: SkewFn = (val, skew) => {
  return cubicBezier(
    {
      start,
      handle1: point(skew, 0),
      handle2: point(1, 1 - skew),
      end,
    },
    val
  ).y
}

export const skewBezier2: SkewFn = (val, skew) => {
  const mapped = map(skew)
  if (mapped < 0) {
    return skewBezier('down', -mapped, val).y
  } else {
    return skewBezier('up', mapped, val).y
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

function denormalize(skew: Normalized) {
  const factor = getBaseLog(0.5, 0.0099)
  return Math.pow(skew, factor) * 100 + 0.01
}

export const skewPower: SkewFn = (val, skew) => {
  // first, skew the normalized skew value so it ranges from 0 to 100
  const deNormalizedSkew = denormalize(skew)

  return Math.pow(val, deNormalizedSkew)
}

export function unSkewPower(skewed: Normalized, skew: Normalized) {
  const deNormalizedSkew = denormalize(skew)

  return Math.pow(skewed, 1 / deNormalizedSkew)
}
