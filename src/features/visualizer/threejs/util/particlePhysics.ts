import { randomRanged } from "features/utils/math/util"

export interface ParticleState {
  x: number
  y: number
  tx: number // target pos (units)
  ty: number
  vx: number // velocity (units/s)
  vy: number
}

function positionInfo(x1: number, y1: number, x2: number, y2: number) {
  // vector from p1 to p2
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
  return {
    dx: dx,
    dy: dy,
    distance: distance,
    // normalized vector from p1 to p2
    nx: distance < 0.00001 ? 0 : dx / distance,
    ny: distance < 0.00001 ? 0 : dy / distance,
  }
}

function velocityInfo(vx: number, vy: number) {
  const speed = Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2))
  return {
    speed: speed,
    // normalized velocity
    nvx: speed < 0.000001 ? 0 : vx / speed,
    nvy: speed < 0.000001 ? 0 : vy / speed,
  }
}

interface Gravity {
  type: 'gravity'
  gravity: number // units/s^2 / distance^2 (decreases exponentially with distance)
  drag: number // units/s^2 * speed^2 (increases exponentially with speed)
}

export type Physics = Gravity

export function gravity(
  dt: number,
  { x, y, tx, ty, vx, vy }: ParticleState,
  { gravity, drag }: Gravity,
): ParticleState {
  const { distance, nx, ny } = positionInfo(x, y, tx, ty)
  const { speed, nvx, nvy } = velocityInfo(vx, vy)
  const rand = randomRanged(-1, 1) * 3

  //acceleration
  const aGrav = gravity // ((distance ^ 2) + 0.01)
  const aDrag = (drag * (speed ^ 2)) / (distance + 0.6)
  let ax = 0
  let ay = 0
  ax += nx * aGrav
  ay += ny * aGrav
  ax -= nvx * aDrag
  ay -= nvy * aDrag
  ax += distance * rand
  ay += distance * rand

  return {
    x: x + vx * dt,
    y: y + vy * dt,
    tx: tx,
    ty: ty,
    vx: vx + ax * dt,
    vy: vy + ay * dt,
  }
}

// interface Smoke {
//   wind: number // units/ms^2
// }

// export function smoke({ x, y, tx, ty, vx, vy, wind }: Smoke) {}
