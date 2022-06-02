import { Normalized } from './util'

export interface Point {
  x: number
  y: number
}

export function point(x: number, y: number): Point {
  return {
    x,
    y,
  }
}

export function pLerp(p0: Point, p1: Point, t: Normalized): Point {
  // (1 - t) * p0 + t * p1
  return pAdd(pMult(p0, 1 - t), pMult(p1, t))
}

function pAdd(p0: Point, p1: Point): Point {
  return {
    x: p0.x + p1.x,
    y: p0.y + p1.y,
  }
}

function pMult(p: Point, val: number): Point {
  return {
    x: p.x * val,
    y: p.y * val,
  }
}
