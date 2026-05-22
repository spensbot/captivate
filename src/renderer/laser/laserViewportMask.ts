import type { LaserViewportMask } from './laserEditorTypes'
import { clamp01 } from './laserAnimationPath'

/**
 * Map split motion-pad XYWH to a canvas mask rectangle (SVG space: origin top-left, y down).
 *
 * Pad outputs match {@link Window2D}: `x`/`y` are the window center (y increases upward on the
 * pad), `width`/`height` are the full window span as a fraction of the canvas (1 = full width).
 */
export function splitPadRectToCanvasMask(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): Pick<LaserViewportMask, 'x' | 'y' | 'w' | 'h'> {
  const cx = clamp01(centerX)
  const cy = clamp01(centerY)
  const w = Math.max(0.02, clamp01(width))
  const h = Math.max(0.02, clamp01(height))
  let x = cx - w * 0.5
  let y = (1 - cy) - h * 0.5
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + w > 1) x = Math.max(0, 1 - w)
  if (y + h > 1) y = Math.max(0, 1 - h)
  return { x, y, w, h }
}
