import type { LaserScene, LaserShapeLayer } from './laserEditorTypes'

export function layerHasAnimatedBeam(layer: LaserShapeLayer): boolean {
  return layer.beam?.kind === 'rainbow' || layer.beam?.kind === 'gradient'
}

export function sceneHasAnimatedContent(scene: LaserScene): boolean {
  if ((scene.contentMode ?? 'draw') === 'preset') {
    return true
  }
  return scene.layers.some(layerHasAnimatedBeam)
}
