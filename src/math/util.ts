import { zip } from '../shared/util'

export type Normalized = number // 0 to 1

export function clampNormalized(val: number) {
  if (val < 0.0) return 0.0
  if (val > 1.0) return 1.0
  return val
}

export function clamp(val: number, min: number, max: number) {
  if (val < min) return min
  if (val > max) return max
  return val
}

export function clampMaybe(val: number, min?: number, max?: number) {
  if (min !== undefined) {
    if (val < min) return min
  }
  if (max !== undefined) {
    if (val > max) return max
  }
  return val
}

export function getBaseLog(x: number, y: number) {
  return Math.log(y) / Math.log(x)
}

export function lerp(start: number, end: number, amount: number) {
  const delta = end - start
  return start + delta * amount
}

export function lerp_clamped(start: number, end: number, amount: number) {
  return lerp(start, end, clamp(amount, 0, 1))
}

// determines the t that val lives at between start and end
export function unlerp(start: number, end: number, val: number) {
  let delta = end - start
  return (val - start) / delta
}

// random number between 0 and max
export function random(max: number) {
  return Math.random() * max
}

export function randomRanged(min: number, max: number) {
  let range = max - min
  return min + Math.random() * range
}

export function randomBool() {
  return Math.random() > 0.5
}

export function magnitude(point: number[]) {
  return point.reduce((acc, dim) => acc + dim ** 2, 0) ** 0.5
}

export function point_delta(start: number[], end: number[]): number[] {
  return zip(start, end).map(([s, e]) => e - s)
}

export function findClosest<T>(
  items: [T, ...number[]][],
  ...target: number[]
): T | null {
  const f: (
    acc: [T | null, number],
    current: [T | null, ...number[]]
  ) => [T | null, number] = ([min_t, min_delta], [t, ...point]) => {
    const delta = magnitude(point_delta(point, target))

    return delta < min_delta ? [t, delta] : [min_t, min_delta]
  }

  return items.reduce(f, [null, Number.MAX_VALUE])[0]
}
