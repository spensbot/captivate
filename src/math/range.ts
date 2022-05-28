import { lerp } from './util'

export type Range = {
  min: number
  max: number
}

export function rLerp(range: Range, amount: number) {
  return lerp(range.min, range.max, amount)
}
