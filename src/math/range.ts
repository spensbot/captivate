import { lerp, unlerp } from './util'

export type Range = {
  min: number
  max: number
}

export function range(min: number, max: number): Range {
  return {
    min,
    max,
  }
}

export function rLerp(range: Range, amount: number) {
  return lerp(range.min, range.max, amount)
}

export function rUnlerp(range: Range, val: number) {
  return unlerp(range.min, range.max, val)
}
