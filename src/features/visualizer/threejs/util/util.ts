import { PerspectiveCamera } from 'three'
import convert from 'color-convert'
import { Normalized, lerp } from '../../../../math/util'

export function colorFromHSV(h: number, s: number, v: number) {
  return Number('0x' + convert.hsv.hex([h * 360, s * 50, v * 100]))
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

export function visibleSizeAtZ(depth: number, camera: PerspectiveCamera) {
  const distanceFromCamera = camera.position.z - depth
  const vFOV = (camera.fov * Math.PI) / 180
  const height = 2 * Math.tan(vFOV / 2) * distanceFromCamera

  return {
    width: height * camera.aspect,
    height: height,
  }
}

export function snapToMultipleOf2(val: number) {
  const LOOP_DEPTH = 10
  let i = 0
  let ref = 1
  let dif = Math.abs(val - ref)
  let relativeDif = dif / ref
  while (relativeDif > 0.55 && i < LOOP_DEPTH) {
    if (val > ref) {
      ref *= 2
    } else {
      ref /= 2
    }
    dif = Math.abs(val - ref)
    relativeDif = dif / ref
    i += 1
  }
  return ref
}

export function getMultiplier(epicness: Normalized, obey: Normalized) {
  // parabola from 0 to 1
  let skewed = epicness ** 3

  // parabola from 0 to 7
  // < 0.5 returns 0.125 - 1.0
  // > 0.5 returns 1.0 - 7.125
  let mapped = skewed * 7

  return lerp(1, mapped, obey)
}
