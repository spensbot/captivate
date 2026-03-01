import { Normalized } from '../math/util'

export type Window = {
  pos: Normalized
  width: Normalized
}

export type WindowAxis = 'x' | 'y' | 'z'
export const windowAxes: WindowAxis[] = ['x', 'y', 'z']

export type Window2D_t = {
  x?: Window
  y?: Window
  z?: Window
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
  const result: Window2D_t = {}

  for (const axis of windowAxes) {
    const relativeAxis = relative[axis]
    if (relativeAxis !== undefined) {
      result[axis] = windowToParentCoords(relativeAxis, normalizedWindow(parent[axis]))
    }
  }

  return result
}
