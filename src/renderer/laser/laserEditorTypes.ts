export type LaserTool =
  | 'select'
  | 'line'
  | 'freehand'
  | 'rect'
  | 'circle'
  | 'poly'
  | 'text'
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
  | 'text'

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

/** Tunable 0–1 knobs for sky-style ILDA presets (spread, density, motion). */
export interface LaserPresetParams {
  spread: number
  density: number
  motion: number
}

/** Soft blanking rectangle in normalized canvas space (cuts beams inside the rect). */
export interface LaserViewportMask {
  enabled: boolean
  /** Top-left corner in editor space (x right, y down). */
  x: number
  y: number
  /** Full width / height as a fraction of the canvas (not half-extent). */
  w: number
  h: number
}

/** Beat-quantized random scene advance (same spirit as DMX auto-scene). */
export interface LaserAutoScene {
  enabled: boolean
  /** Beats between random scene picks (uses engine beat counter when playing). */
  periodBeats: number
}

export type LaserContentMode = 'draw' | 'preset'

/** Per-preset-layer style overrides (keyed by procedural layer `id`, e.g. `scene::preset::…`). */
export type LaserPresetLayerOverride = {
  color?: string
  /** `null` forces solid stroke (clears gradient/rainbow). */
  beam?: LayerBeamStroke | null
}

export interface LaserShapeLayer {
  id: string
  kind: LaserLayerKind
  /** Primary / thumbnail / fallback solid stroke. */
  color: string
  /** Normalized 0–1 in editor space (x right, y down). */
  points: NormPoint[]
  /** When set, stroke is sampled along path length (gradient or rainbow). */
  beam?: LayerBeamStroke
  /** For `kind: 'text'`: label string and font stack id. */
  text?: string
  fontFamily?: string
}

export interface LaserScene {
  id: string
  name: string
  layers: LaserShapeLayer[]
  /**
   * `preset` = procedural sky-style content (see `presetId`). `draw` = manual / SVG / text.
   * Default `draw` when omitted for older scenes.
   */
  contentMode?: LaserContentMode
  presetId?: string
  presetParams?: Partial<LaserPresetParams>
  /** Beam color for preset layers (independent of global line swatch when set). */
  presetColor?: string
  /** When true (default for new preset scenes), preset layout tracks split XY + window. */
  presetUseSplitXY?: boolean
  /** When `contentMode === 'preset'`, merge these fields onto resolved preset layers by `id`. */
  presetLayerOverrides?: Record<string, LaserPresetLayerOverride>
  /**
   * Optional motion path in normalized editor space (≥2 points). Progress 0→1 moves
   * geometry along this polyline (displacement from the start point) and drives hue
   * sampling in the editor preview.
   */
  animationPath?: NormPoint[]
  /** Blank beams inside this axis-aligned rectangle (normalized 0–1). */
  viewportMask?: LaserViewportMask
  /** When true, mask rect follows split motion-pad position + width/height output. */
  viewportMaskLinkSplit?: boolean
  /** Random scene cycling while transport runs (local to laser page state). */
  autoScene?: LaserAutoScene
}

/** @deprecated Scene strip layout is measured from available width/height. */
export const LASER_SCENE_GRID_COLS = 4
/** @deprecated Scene strip layout is measured from available width/height. */
export const LASER_SCENE_GRID_ROWS = 2
