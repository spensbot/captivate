import {
  LASER_SCENE_THUMB_GAP_PX,
  LASER_SCENE_THUMB_WIDTH_REM,
} from './laserLayoutConstants'

export type LaserSceneGridLayout = {
  cols: number
  rows: number
  perPage: number
}

function rootFontSizePx(): number {
  if (typeof document === 'undefined') return 16
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

/** Fit as many columns as the strip width allows, then rows by height, before paging. */
export function measureLaserSceneGridLayout(
  widthPx: number,
  heightPx: number
): LaserSceneGridLayout {
  const thumbW = LASER_SCENE_THUMB_WIDTH_REM * rootFontSizePx()
  const gap = LASER_SCENE_THUMB_GAP_PX
  const cols = Math.max(
    1,
    Math.floor((Math.max(0, widthPx) + gap) / (thumbW + gap))
  )
  const thumbH = thumbW
  const rows = Math.max(
    1,
    Math.floor((Math.max(0, heightPx) + gap) / (thumbH + gap))
  )
  return { cols, rows, perPage: cols * rows }
}
