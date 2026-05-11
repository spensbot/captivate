export type LaserTool =
  | 'select'
  | 'line'
  | 'freehand'
  | 'rect'
  | 'circle'
  | 'poly'
  | 'eraser'
  | 'spline'
  | 'pathAddVertex'
  | 'pathRemoveVertex'

/** How imported SVG geometry is split into `LaserShapeLayer`s. */
export type SvgImportMode = 'single' | 'byGroup' | 'byElement'

export type NormPoint = { x: number; y: number }

export type LaserLayerKind =
  | 'line'
  | 'freehand'
  | 'rect'
  | 'circle'
  | 'poly'
  | 'spline'

/** Which additive primaries this fixture can reproduce (RGBY + optional white). */
export interface LaserRgbCapabilities {
  red: boolean
  green: boolean
  blue: boolean
  yellow: boolean
  white: boolean
}

export interface BeamGradientStop {
  offset: number
  color: string
}

/** Optional beam appearance beyond flat `color` (all stops gated for laser output). */
export type LayerBeamStroke =
  | { kind: 'gradient'; stops: BeamGradientStop[] }
  | { kind: 'rainbow'; cycles: number }

export interface LaserShapeLayer {
  id: string
  kind: LaserLayerKind
  /** Primary / thumbnail / fallback solid stroke. */
  color: string
  /** Normalized 0–1 in editor space (x right, y down). */
  points: NormPoint[]
  /** When set, stroke is sampled along path length (gradient or rainbow). */
  beam?: LayerBeamStroke
}

export interface LaserScene {
  id: string
  name: string
  layers: LaserShapeLayer[]
}

export const LASER_SCENE_GRID_COLS = 4
export const LASER_SCENE_GRID_ROWS = 2
export const LASER_SCENES_PER_PAGE =
  LASER_SCENE_GRID_COLS * LASER_SCENE_GRID_ROWS
