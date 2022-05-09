import { PerspectiveCamera } from 'three'
import convert from 'color-convert'

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
