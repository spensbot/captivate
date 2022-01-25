export interface ParticleState {
  x: number
  y: number
  ix: number // initial pos (units)
  iy: number
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
  { x, y, ix, iy, vx, vy }: ParticleState,
  { gravity, drag }: Gravity
): ParticleState {
  const { dx, dy, distance, nx, ny } = positionInfo(x, y, ix, iy)
  const { speed, nvx, nvy } = velocityInfo(vx, vy)

  //acceleration
  const aGrav = gravity // ((distance ^ 2) + 0.01)
  const aDrag = (drag * (speed ^ 2)) / (distance + 0.6)
  let ax = 0
  let ay = 0
  ax += nx * aGrav
  ay += ny * aGrav
  ax -= nvx * aDrag
  ay -= nvy * aDrag

  // if (print) {
  // console.log(
  //   `x: ${x.toFixed(3)}  vx: ${vx.toFixed(5)}  ax: ${ax.toFixed(7)}`
  // )
  // console.log(
  //   ` ==> x: ${(x + vx * dt).toFixed(5)}  vx: ${(vx + ax * dt).toFixed(7)}`
  // )
  // console.log(`pos: (${x}, ${y}) veloc: (${vx}, ${vy}) accel: (${ax}, ${ay})`)
  // console.log(` ==> pos: (${x + vx * dt}, ${y + vy * dt}) veloc: (${vx}, ${vy}) accel: (${ax}, ${ay})`)
  // }

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
