interface ParticleState {
  x: number
  y: number
  ix: number // initial pos (units)
  iy: number
  vx: number // velocity (units/ms)
  vy: number
}

function posInfo(x1: number, y1: number, x2: number, y2: number) {
  // vector from p1 to p2
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
  return {
    dx: dx,
    dy: dy,
    distance: distance,
    // normalized vector from p1 to p2
    nx: dx / distance,
    ny: dy / distance,
  }
}

function vInfo(vx: number, vy: number) {
  const speed = Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2))
  return {
    speed: speed,
    // normalized velocity
    nvx: vx / speed,
    nvy: vy / speed,
  }
}

interface Gravity {
  gravity: number // units/ms^2 * distance (increases with distance)
  drag: number // units/ms^2 / distance (decreases with distance)
}

export function gravity(
  dt: number,
  { x, y, ix, iy, vx, vy }: ParticleState,
  { gravity, drag }: Gravity
): ParticleState {
  const { dx, dy, distance, nx, ny } = posInfo(x, y, ix, iy)
  const { speed, nvx, nvy } = vInfo(vx, vy)

  //acceleration
  const aGrav = gravity * distance
  const aDrag = ((drag / (distance + 0.1)) * speed) ^ 2
  const ax = nx * aGrav - nvx * aDrag
  const ay = ny * aGrav - nvy * aDrag

  return {
    x: x + vx * dt,
    y: y + vy * dt,
    ix: ix,
    iy: iy,
    vx: vx + ax * dt,
    vy: vy + ay * dt,
  }
}

// interface Smoke {
//   wind: number // units/ms^2
// }

// export function smoke({ x, y, ix, iy, vx, vy, wind }: Smoke) {}
