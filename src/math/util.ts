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
