import { Normalized } from '../math/util'

export type Window = {
  pos: Normalized
  width: Normalized
}

export type Window2D_t = {
  x?: Window
  y?: Window
}

function normalizedWindow(window?: Window): Window {
  const pos = Number.isFinite(window?.pos) ? (window?.pos as number) : 0.5
  const width =
    Number.isFinite(window?.width) && (window?.width as number) > 0
      ? (window?.width as number)
      : 1

  return {
    pos,
    width,
  }
}

export function windowToParentCoords(relative: Window, parent: Window): Window {
  return {
    pos: parent.pos + (relative.pos - 0.5) * parent.width,
    width: relative.width * parent.width,
  }
}

export function window2DToParentCoords(
  relative: Window2D_t,
  parent: Window2D_t
): Window2D_t {
  return {
    x: relative.x
      ? windowToParentCoords(relative.x, normalizedWindow(parent.x))
      : undefined,
    y: relative.y
      ? windowToParentCoords(relative.y, normalizedWindow(parent.y))
      : undefined,
  }
}
