import { Normalized } from '../math/util'

export type Window = {
  pos: Normalized
  width: Normalized
}

export type Window2D_t = {
  x?: Window
  y?: Window
}

export function windowToParentCoords(relative: Window, parent: Window): Window {
  return {
    pos: parent.pos + (relative.pos - 0.5) * parent.width,
    width: relative.width * parent.width
  }
}

export function window2DToParentCoords(relative: Window2D_t, parent: Window2D_t): Window2D_t {
  return {
    x: relative.x && parent.x ? windowToParentCoords(relative.x, parent.x) : undefined,
    y: relative.y && parent.y ? windowToParentCoords(relative.y, parent.y) : undefined
  }
}
