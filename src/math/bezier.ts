import { Normalized } from './util'
import { Point, point, pLerp } from './point'

export interface QuadBezier {
  start: Point
  handle: Point
  end: Point
}

export function quadBezier({ start, handle, end }: QuadBezier, t: Normalized) {
  const a = pLerp(start, handle, t)
  const b = pLerp(handle, end, t)
  return pLerp(a, b, t)
}

export interface CubicBezier {
  start: Point
  handle1: Point
  handle2: Point
  end: Point
}

export function cubicBezier(
  { start, handle1, handle2, end }: CubicBezier,
  t: Normalized
) {
  const a = pLerp(start, handle1, t)
  const b = pLerp(handle1, handle2, t)
  const c = pLerp(handle2, end, t)
  const d = pLerp(a, b, t)
  const e = pLerp(b, c, t)
  return pLerp(d, e, t)
}

// ====================================================================
// Custom modified compound quad-like bezier for use in skew functions

const p0 = point(0, 0)
const p4 = point(1, 1)

export interface SkewBezier {
  skew: Normalized
}

export function skewBezier(
  dir: 'up' | 'down',
  skew: Normalized,
  t: Normalized
) {
  // TODO: Actaully break down this function algebraically, to substitue actual point values and simplify the calulations
  const { p1, p2, p3 } =
    dir === 'up'
      ? {
          p1: point(0, skew),
          p2: point(0, 1),
          p3: point(1 - skew, 1),
        }
      : {
          p1: point(skew, 0),
          p2: point(1, 0),
          p3: point(1, 1 - skew),
        }

  if (t < 0.5) {
    const t_ = 2 * t
    const a = pLerp(p0, p1, t_)
    const b = pLerp(p2, p3, t_)
    return pLerp(a, b, t)
  } else {
    const t_ = (t - 0.5) * 2
    const a = pLerp(p1, p2, t_)
    const b = pLerp(p3, p4, t_)
    return pLerp(a, b, t)
  }
}

export function findYForX(x: Normalized, bezierFn: (t: Normalized) => Point) {
  let t = x
  Array(5)
    .fill(0)
    .forEach((_) => {
      const res = bezierFn(t).x
      if (res < x) {
        t *= 2
      } else {
        t /= 2
      }
    })
}

// function compountQuadBezier(start0: Point, start1: Point, end0: Point, end1: Point, halfT: number) {
//   const a = pLerp(start0, start1, 2 * halfT)
//   const b =
// }
