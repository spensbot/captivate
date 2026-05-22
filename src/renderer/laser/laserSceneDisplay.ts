import type {
  LaserScene,
  LaserShapeLayer,
  LaserPresetLayerOverride,
  NormPoint,
} from './laserEditorTypes'
import type { LaserPresetSplitPin } from './laserPresetCatalog'
import { resolveLaserPresetLayers } from './laserPresetCatalog'
import { shiftShapeLayerPoints } from './laserAnimationPath'

export function applyPresetLayerOverrides(
  base: LaserShapeLayer[],
  overrides?: Record<string, LaserPresetLayerOverride>
): LaserShapeLayer[] {
  if (!overrides) return base
  return base.map((layer) => {
    const o = overrides[layer.id]
    if (!o) return layer
    const next: LaserShapeLayer = { ...layer }
    if (o.color !== undefined) next.color = o.color
    if ('beam' in o) {
      if (o.beam === null) delete next.beam
      else if (o.beam !== undefined) next.beam = o.beam
    }
    return next
  })
}

/**
 * Layers shown in the editor / thumbnails: manual `layers` in draw mode, or procedural
 * preset geometry when `contentMode === 'preset'`.
 */
export function getLaserSceneDisplayLayers(
  scene: LaserScene,
  splitPin: LaserPresetSplitPin | undefined,
  playback01 = 0.5,
  shapeMotionDelta?: NormPoint
) {
  const mode = scene.contentMode ?? 'draw'
  let layers =
    mode === 'preset'
      ? (() => {
          const usePin = scene.presetUseSplitXY !== false
          const pin = usePin ? splitPin : undefined
          const color = scene.presetColor ?? '#40ffb8'
          const base = resolveLaserPresetLayers(
            scene.presetId,
            scene.id,
            color,
            scene.presetParams,
            pin,
            playback01
          )
          return applyPresetLayerOverrides(base, scene.presetLayerOverrides)
        })()
      : scene.layers

  if (
    shapeMotionDelta &&
    (shapeMotionDelta.x !== 0 || shapeMotionDelta.y !== 0)
  ) {
    layers = layers.map((layer) => shiftShapeLayerPoints(layer, shapeMotionDelta))
  }
  return layers
}
