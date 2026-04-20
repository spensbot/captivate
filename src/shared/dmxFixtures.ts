import { Window2D_t } from '../shared/window'
import { ColorChannel, ColorKind } from './dmxColors'
import { nanoid } from 'nanoid'

export const DMX_MIN_VALUE = 0
export const DMX_MAX_VALUE = 255
export const DMX_NUM_CHANNELS = 512
export const DMX_MAX_UNIVERSES = 16
export const MOVER_MIN_PAN_RANGE_DEG = 45
export const MOVER_MAX_PAN_RANGE_DEG = 1440
export const MOVER_MIN_TILT_RANGE_DEG = 30
export const MOVER_MAX_TILT_RANGE_DEG = 720
export const MOVER_DEFAULT_PAN_RANGE_DEG = 540
export const MOVER_DEFAULT_TILT_RANGE_DEG = 270
export const DMX_DEFAULT_VALUE = 0

export type DmxChannel = number // 1 - 512
export type DmxValue = number // 0 - 255

export type AxisDir = 'x' | 'y'
export const axisDirList: AxisDir[] = ['x', 'y']

export function axisDirName(dir: AxisDir): string {
  return dir === 'x' ? 'Pan' : 'Tilt'
}

type ChannelMaster = {
  type: 'master'
  min: DmxValue
  max: DmxValue
  isOnOff: boolean
}

type ChannelColor = {
  type: 'color'
  color: ColorChannel
}

type ChannelStrobe = {
  type: 'strobe'
  default_strobe: DmxValue
  default_solid: DmxValue
}

export type ChannelFxTrigger = {
  type: 'fxTrigger'
  name: string
  off: DmxValue
  on: DmxValue
}

export type ChannelFxLevel = {
  type: 'fxLevel'
  name: string
  default: DmxValue
  min: DmxValue
  max: DmxValue
}

export type ChannelAxis = {
  type: 'axis'
  dir: AxisDir
  isFine: boolean
  min: DmxValue
  max: DmxValue
}

export type ColorMapColor = {
  max: number
  hue: number
  saturation: number
  kind?: ColorKind
}

export type ChannelColorMap = {
  type: 'colorMap'
  colors: ColorMapColor[]
}

export type GoboMapItem = {
  name: string
  max: DmxValue
}

export type ChannelGoboMap = {
  type: 'goboMap'
  gobos: GoboMapItem[]
  defaultIndex: number
}

export type ChannelCustom = {
  type: 'custom'
  name: string
  default: DmxValue

  isControllable: boolean
  min: DmxValue
  max: DmxValue
}

export const defaultCustomChannels = ['speed']

export type LeafFixtureChannel =
  | ChannelMaster
  | ChannelColor
  | ChannelColorMap
  | ChannelGoboMap
  | ChannelStrobe
  | ChannelFxTrigger
  | ChannelFxLevel
  | ChannelAxis
  | ChannelCustom

export type SplitChannelRange = {
  id: string
  name: string
  min: DmxValue
  max: DmxValue
  channel: LeafFixtureChannel
}

export type ChannelSplit = {
  type: 'split'
  ranges: SplitChannelRange[]
}

export type FixtureChannel = LeafFixtureChannel | ChannelSplit

export type ChannelType = FixtureChannel['type']
export type NonSplitChannelType = Exclude<ChannelType, 'split'>

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'colorMap',
  'goboMap',
  'strobe',
  'fxTrigger',
  'fxLevel',
  'axis',
  'custom',
  'split',
]

export const nonSplitChannelTypes: NonSplitChannelType[] = channelTypes.filter(
  (type): type is NonSplitChannelType => type !== 'split'
)

export function initFixtureChannel(
  type?: FixtureChannel['type']
): FixtureChannel {
  if (type === 'color') {
    return initChannelColor(0, 1)
  } else if (type === 'strobe') {
    return initChannelStrobe()
  } else if (type === 'axis') {
    return initChannelAxis('x', false)
  } else if (type === 'fxTrigger') {
    return initChannelFxTrigger('Trigger')
  } else if (type === 'fxLevel') {
    return initChannelFxLevel('Level')
  } else if (type === 'colorMap') {
    return initChannelColorMap([
      { max: 0, hue: 0, saturation: 1.0, kind: 'color' },
    ])
  } else if (type === 'goboMap') {
    return initChannelGoboMap([{ name: 'Open', max: DMX_MIN_VALUE }])
  } else if (type === 'custom') {
    return initChannelCustom('Custom')
  } else if (type === 'split') {
    return initChannelSplit()
  }
  return initChannelMaster()
}

function clampDmxValue(value: number, fallback: number): DmxValue {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function normalizeSplitRangeBounds(
  min: number,
  max: number
): { min: DmxValue; max: DmxValue } {
  const normalizedMin = clampDmxValue(Math.min(min, max), DMX_MIN_VALUE)
  const normalizedMax = clampDmxValue(Math.max(min, max), DMX_MAX_VALUE)
  return {
    min: normalizedMin,
    max: normalizedMax,
  }
}

export function initSplitChannelRange(
  min: number,
  max: number,
  channel: LeafFixtureChannel,
  name: string = 'Range'
): SplitChannelRange {
  const bounds = normalizeSplitRangeBounds(min, max)
  const trimmedName = name.trim()
  return {
    id: nanoid(),
    name: trimmedName.length > 0 ? trimmedName : 'Range',
    min: bounds.min,
    max: bounds.max,
    channel,
  }
}

export function initChannelSplit(): ChannelSplit {
  return {
    type: 'split',
    ranges: [
      initSplitChannelRange(
        DMX_MIN_VALUE,
        9,
        {
          ...initChannelFxTrigger('On/Off'),
          off: DMX_MIN_VALUE,
          on: 9,
        },
        'On/Off'
      ),
      initSplitChannelRange(
        10,
        DMX_MAX_VALUE,
        {
          ...initChannelFxLevel('FX Level'),
          default: 10,
          min: 10,
          max: DMX_MAX_VALUE,
        },
        'FX Level'
      ),
    ],
  }
}

export function initChannelSplitFromChannel(
  channel: FixtureChannel
): ChannelSplit {
  if (channel.type === 'split') {
    return {
      type: 'split',
      ranges: channel.ranges.map((range) => ({
        id: range.id,
        name: range.name,
        min: range.min,
        max: range.max,
        channel: range.channel,
      })),
    }
  }

  return {
    type: 'split',
    ranges: [
      initSplitChannelRange(DMX_MIN_VALUE, DMX_MAX_VALUE, channel, 'Range 1'),
    ],
  }
}

export function fixtureChannelLeafChannels(
  channel: FixtureChannel
): LeafFixtureChannel[] {
  if (channel.type === 'split') {
    return channel.ranges.map((range) => range.channel)
  }
  return [channel]
}

export function initChannelColorMap(colors: ColorMapColor[]): ChannelColorMap {
  return {
    type: 'colorMap',
    colors,
  }
}

export function initChannelGoboMap(gobos: GoboMapItem[]): ChannelGoboMap {
  return {
    type: 'goboMap',
    gobos,
    defaultIndex: 0,
  }
}

export function initChannelStrobe(): ChannelStrobe {
  return {
    type: 'strobe',
    default_solid: DMX_MIN_VALUE,
    default_strobe: DMX_MAX_VALUE,
  }
}

export function initChannelFxTrigger(name: string): ChannelFxTrigger {
  return {
    type: 'fxTrigger',
    name,
    off: DMX_MIN_VALUE,
    on: DMX_MAX_VALUE,
  }
}

export function initChannelFxLevel(name: string): ChannelFxLevel {
  return {
    type: 'fxLevel',
    name,
    default: DMX_MIN_VALUE,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

export function initChannelAxis(dir: AxisDir, isFine: boolean): ChannelAxis {
  return {
    type: 'axis',
    dir,
    isFine,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

export function initChannelColor(
  hue: number,
  saturation: number
): ChannelColor {
  return {
    type: 'color',
    color: {
      hue,
      saturation,
      kind: saturation < 0.02 ? 'white' : 'color',
    },
  }
}

export function initChannelMaster(): ChannelMaster {
  return {
    type: 'master',
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
    isOnOff: false,
  }
}

export function initChannelCustom(name: string): ChannelCustom {
  return {
    type: 'custom',
    name,
    default: DMX_MIN_VALUE,
    isControllable: false,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

export type MoverPanCalibration = {
  min: number
  max: number
  front: number
  back: number
  home: number
  rangeDeg: number
  turns?: number
  invert: boolean
}

export type MoverTiltCalibration = {
  min: number
  max: number
  down: number
  forward: number
  up: number
  home: number
  rangeDeg: number
  invert: boolean
}

export type MoverCalibration = {
  pan: MoverPanCalibration
  tilt: MoverTiltCalibration
  notes?: string
}

export function initMoverCalibration(): MoverCalibration {
  return {
    pan: {
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
      front: 128,
      back: DMX_MIN_VALUE,
      home: 128,
      rangeDeg: MOVER_DEFAULT_PAN_RANGE_DEG,
      invert: false,
    },
    tilt: {
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
      down: DMX_MIN_VALUE,
      forward: 128,
      up: DMX_MAX_VALUE,
      home: 128,
      rangeDeg: MOVER_DEFAULT_TILT_RANGE_DEG,
      invert: false,
    },
  }
}

export type MoverBoundCorner = {
  pan: number
  tilt: number
}

export type MoverBounds = {
  topLeft: MoverBoundCorner
  topRight: MoverBoundCorner
  bottomLeft: MoverBoundCorner
  bottomRight: MoverBoundCorner
}

export function initMoverBounds(): MoverBounds {
  return {
    topLeft: {
      pan: DMX_MIN_VALUE,
      tilt: DMX_MAX_VALUE,
    },
    topRight: {
      pan: DMX_MAX_VALUE,
      tilt: DMX_MAX_VALUE,
    },
    bottomLeft: {
      pan: DMX_MIN_VALUE,
      tilt: DMX_MIN_VALUE,
    },
    bottomRight: {
      pan: DMX_MAX_VALUE,
      tilt: DMX_MIN_VALUE,
    },
  }
}

export type MoverMountOrientation = 'upright' | 'inverted'

export type FixtureModelKind =
  | 'auto'
  | 'parCan'
  | 'washBar'
  | 'uplight'
  | 'moverSpot'
  | 'moverWash'
  | 'atmosphericFx'

export type AtmosphereEffectType =
  | 'fog'
  | 'haze'
  | 'co2'
  | 'bubble'
  | 'confetti'
  | 'flame'

export type AtmosphereNozzleDirection = 'up' | 'forward'
export type WashBarLayoutMode = 'linear' | 'multiStrip'
export type FixtureBodyShape = 'box' | 'cylinder'
export type FixtureEmitterShape = 'disc' | 'rect-h' | 'rect-v'

export type FixtureEmitterDefinition = {
  id: string
  x: number
  y: number
  z: number
  /**
   * Nominal emitter size on the fixture opening face, **meters** (disc =
   * diameter; for rectangles, used as a fallback when `rectWidthM` /
   * `rectHeightM` are missing). Legacy ~0.15–4 scales convert on load.
   */
  size: number
  shape: FixtureEmitterShape
  channelIndexes: number[]
  /**
   * Rectangle only: horizontal extent on the fixture face (meters), matching
   * the layout editor X axis and Three.js emitter box X.
   */
  rectWidthM?: number
  /**
   * Rectangle only: vertical extent on the fixture face (meters), matching
   * the layout editor Y axis and Three.js emitter box Y.
   */
  rectHeightM?: number
}

export const fixtureModelKinds: FixtureModelKind[] = [
  'auto',
  'parCan',
  'washBar',
  'uplight',
  'moverSpot',
  'moverWash',
  'atmosphericFx',
]

export const washBarLayoutModes: WashBarLayoutMode[] = ['linear', 'multiStrip']

export function washBarLayoutModeName(mode: WashBarLayoutMode): string {
  if (mode === 'multiStrip') {
    return 'Multi-Strip (RGB + CW + WW)'
  }
  return 'Linear (Legacy)'
}

export function fixtureModelKindName(kind: FixtureModelKind): string {
  if (kind === 'auto') return 'Auto'
  if (kind === 'parCan') return 'PAR Can'
  if (kind === 'washBar') return 'Wash Bar'
  if (kind === 'uplight') return 'Uplight'
  if (kind === 'moverSpot') return 'Mover Spot/Beam'
  if (kind === 'moverWash') return 'Mover Wash'
  return 'Atmospheric FX Box'
}

/** PAR box forward-face layout (emitters on the wide rectangular face). */
export type ParRectLayoutMode = 'line' | 'grid'
/** PAR cylinder forward-face layout (emitters on the round face). */
export type ParCylinderLayoutMode = 'ring' | 'honeycomb'

/** Default PAR dimensions (meters). */
export const PAR_DEFAULT_CYLINDER_DIAMETER_M = 0.1524 // 6"
export const PAR_DEFAULT_CYLINDER_DEPTH_M = 0.1016 // 4"
export const PAR_DEFAULT_BOX_WIDTH_M = 0.6096 // 2 ft
export const PAR_DEFAULT_BOX_HEIGHT_M = 0.0762 // 3"
export const PAR_DEFAULT_BOX_DEPTH_M = 0.1016 // 4"

export type FixtureModelConfig = {
  kind: FixtureModelKind
  emittersPerSubFixture: number
  width: number
  bodyShape: FixtureBodyShape
  bodyHeight: number
  bodyDepth: number
  bodyDiameter: number
  moverBeamAngleDeg: number
  atmosphereEffect: AtmosphereEffectType
  atmosphereNozzleDirection: AtmosphereNozzleDirection
  washBarLayoutMode: WashBarLayoutMode
  washBarWarmWhiteCount: number
  washBarCoolWhiteCount: number
  washBarRgbCount: number
  useCustomEmitterLayout: boolean
  customEmitters: FixtureEmitterDefinition[]
  /**
   * When true, PAR face width / cylinder diameter may grow to fit emitters at
   * comfortable spacing. Cleared when the user edits face dimensions manually.
   */
  emitterFaceAutoSize: boolean
  parRectLayout: ParRectLayoutMode
  parCylinderLayout: ParCylinderLayoutMode
}

export type FixtureRotation = {
  x: number
  y: number
  z: number
}

export function initFixtureRotation(): FixtureRotation {
  return {
    x: 0,
    y: 0,
    z: 0,
  }
}

export const FIXTURE_MODEL_MIN_EMITTERS = 1
export const FIXTURE_MODEL_MAX_EMITTERS = 64
export const FIXTURE_MODEL_MIN_WIDTH = 0.2
export const FIXTURE_MODEL_MAX_WIDTH = 8
export const FIXTURE_MODEL_MIN_MOVER_BEAM_ANGLE = 2.5
export const FIXTURE_MODEL_MAX_MOVER_BEAM_ANGLE = 25
export const FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE = 9.5
export const FIXTURE_MODEL_DEFAULT_MOVER_WASH_BEAM_ANGLE = 20.9

function clampModelEmitters(value: number): number {
  if (!Number.isFinite(value)) {
    return FIXTURE_MODEL_MIN_EMITTERS
  }

  return Math.max(
    FIXTURE_MODEL_MIN_EMITTERS,
    Math.min(FIXTURE_MODEL_MAX_EMITTERS, Math.round(value))
  )
}

function clampModelWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(
    FIXTURE_MODEL_MIN_WIDTH,
    Math.min(FIXTURE_MODEL_MAX_WIDTH, value)
  )
}

function clampModelDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0.04, Math.min(FIXTURE_MODEL_MAX_WIDTH, value))
}

function clampMoverBeamAngle(value: number): number {
  if (!Number.isFinite(value)) {
    return FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE
  }

  return Math.max(
    FIXTURE_MODEL_MIN_MOVER_BEAM_ANGLE,
    Math.min(FIXTURE_MODEL_MAX_MOVER_BEAM_ANGLE, value)
  )
}

export function fixedEmitterCountForModelKind(
  kind: FixtureModelKind
): number | null {
  if (kind === 'moverSpot') return 1
  if (kind === 'moverWash') return 7
  return null
}

export function defaultMoverBeamAngleForModelKind(
  kind: FixtureModelKind
): number {
  if (kind === 'moverWash') {
    return FIXTURE_MODEL_DEFAULT_MOVER_WASH_BEAM_ANGLE
  }
  if (kind === 'atmosphericFx') {
    return 16
  }

  return FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE
}

export function initFixtureModelConfig(): FixtureModelConfig {
  return {
    kind: 'auto',
    emittersPerSubFixture: 1,
    width: 1,
    bodyShape: 'box',
    bodyHeight: 0.2,
    bodyDepth: 0.14,
    bodyDiameter: 0.45,
    moverBeamAngleDeg: FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE,
    atmosphereEffect: 'fog',
    atmosphereNozzleDirection: 'up',
    washBarLayoutMode: 'linear',
    washBarWarmWhiteCount: 12,
    washBarCoolWhiteCount: 13,
    washBarRgbCount: 16,
    useCustomEmitterLayout: true,
    customEmitters: [],
    emitterFaceAutoSize: true,
    parRectLayout: 'grid',
    parCylinderLayout: 'honeycomb',
  }
}

export function initFixtureEmitterDefinition(
  channelIndexes: number[] = [0]
): FixtureEmitterDefinition {
  return {
    id: nanoid(),
    x: 0.5,
    y: 0.5,
    z: 0.5,
    size: EMITTER_DEFAULT_DIAMETER_M,
    shape: 'disc',
    channelIndexes,
  }
}

/** Even spacing on a ring (round PAR front face, normalized 0–1). Preserves ids/channels/z/size/shape. */
export function layoutEmittersParRing(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const pos = normalizedParRingEmitterPositions(n)
  return emitters.map((em, i) => {
    const p = pos[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
}

export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/** Visual parity: old `size` 1.0 maps to this diameter (m). */
export const EMITTER_DIAMETER_REFERENCE_M = 0.045
export const EMITTER_DEFAULT_DIAMETER_M = EMITTER_DIAMETER_REFERENCE_M
export const EMITTER_DIAMETER_MIN_M = 0.002
export const EMITTER_DIAMETER_MAX_M = 0.6
const EMITTER_LEGACY_SIZE_TO_DIAMETER_M = EMITTER_DIAMETER_REFERENCE_M
const LEGACY_EMITTER_SIZE_MAX = 4.001
const LEGACY_EMITTER_SIZE_MIN = 0.149

/** Target fill when auto-sizing emitter diameter vs. available face spacing. */
export const PAR_EMITTER_FACE_FILL_RATIO = 0.75
/** Match Lighting3D span factor for custom emitters on the face. */
export const PAR_EMITTER_VISUAL_FACE_SCALE = 0.9

export function clampEmitterDiameterM(value: number): number {
  if (!Number.isFinite(value)) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  return Math.min(
    EMITTER_DIAMETER_MAX_M,
    Math.max(EMITTER_DIAMETER_MIN_M, value)
  )
}

export function normalizeEmitterDiameterM(raw: unknown): number {
  const s = Number(raw)
  if (!Number.isFinite(s)) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  if (s <= LEGACY_EMITTER_SIZE_MAX && s >= LEGACY_EMITTER_SIZE_MIN) {
    return clampEmitterDiameterM(s * EMITTER_LEGACY_SIZE_TO_DIAMETER_M)
  }
  return clampEmitterDiameterM(s)
}

/** Converts stored diameter (m) to the renderer `sizeScale` multiplier. */
export function emitterDiameterMToVisualSizeScale(diameterM: number): number {
  const d = clampEmitterDiameterM(diameterM)
  return Math.max(0.034, Math.min(48, d / EMITTER_DIAMETER_REFERENCE_M))
}

/** Max edge length for rectangular emitter face dimensions (meters). */
export const RECT_EMITTER_FACE_MAX_EXTENT_M = 2

export function clampRectFaceExtentM(value: number): number {
  if (!Number.isFinite(value)) {
    return EMITTER_DIAMETER_MIN_M
  }
  return Math.min(
    RECT_EMITTER_FACE_MAX_EXTENT_M,
    Math.max(EMITTER_DIAMETER_MIN_M, value)
  )
}

/**
 * Face-plane width (X) and height (Y) in meters for rectangles; for discs both
 * equal the clamped diameter. Missing rect fields fall back to legacy 0.05 /
 * 0.016 proportions scaled by `size`.
 */
export function normalizeRectEmitterFaceDimensionsM(
  emitter: Pick<
    FixtureEmitterDefinition,
    'shape' | 'size' | 'rectWidthM' | 'rectHeightM'
  >
): { widthM: number; heightM: number } {
  const d = clampEmitterDiameterM(emitter.size)
  if (emitter.shape === 'disc') {
    return { widthM: d, heightM: d }
  }
  const scale = d / EMITTER_DIAMETER_REFERENCE_M
  const longM = Math.max(EMITTER_DIAMETER_MIN_M, 0.05 * scale)
  const shortM = Math.max(EMITTER_DIAMETER_MIN_M, 0.016 * scale)
  const fallback =
    emitter.shape === 'rect-v'
      ? { widthM: shortM, heightM: longM }
      : { widthM: longM, heightM: shortM }

  const w = emitter.rectWidthM
  const h = emitter.rectHeightM
  if (
    typeof w === 'number' &&
    Number.isFinite(w) &&
    typeof h === 'number' &&
    Number.isFinite(h) &&
    w >= EMITTER_DIAMETER_MIN_M &&
    h >= EMITTER_DIAMETER_MIN_M
  ) {
    return {
      widthM: clampRectFaceExtentM(w),
      heightM: clampRectFaceExtentM(h),
    }
  }
  return {
    widthM: clampRectFaceExtentM(fallback.widthM),
    heightM: clampRectFaceExtentM(fallback.heightM),
  }
}

/** Box front opening width matches Lighting3D / WYSIWYG (`width * scale`). */
export const FIXTURE_EMITTER_FACE_WIDTH_SCALE = 0.7

/** Gap between emitters as a fraction of center-to-center distance on the face (m). */
const AUTO_EMITTER_FACE_PACKING_RATIO = 0.1
/** Inset from face edges (each side) vs short span when sizing to the face (m). */
const AUTO_EMITTER_FACE_EDGE_RATIO = 0.05

export function fixtureFrontFaceDimensionsM(
  model: Pick<FixtureModelConfig, 'bodyShape' | 'width' | 'bodyHeight' | 'bodyDiameter'>
): { faceWidthM: number; faceHeightM: number } {
  if (model.bodyShape === 'cylinder') {
    const d = Math.max(0.05, model.bodyDiameter)
    return { faceWidthM: d, faceHeightM: d }
  }
  return {
    faceWidthM: Math.max(0.05, model.width * FIXTURE_EMITTER_FACE_WIDTH_SCALE),
    faceHeightM: Math.max(0.05, model.bodyHeight),
  }
}

function nearestEmitterNeighborDistanceM(
  positions: { x: number; y: number }[],
  index: number,
  faceWidthM: number,
  faceHeightM: number
): number {
  const p = positions[index]
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < positions.length; i++) {
    if (i === index) continue
    const q = positions[i]
    const dx = (q.x - p.x) * faceWidthM
    const dy = (q.y - p.y) * faceHeightM
    const d = Math.hypot(dx, dy)
    if (d < best) {
      best = d
    }
  }
  if (!Number.isFinite(best) || best < 1e-9) {
    return Math.min(faceWidthM, faceHeightM)
  }
  return best
}

/**
 * Resize emitter `size` (and rect faces) from normalized positions and physical face
 * dimensions so discs/rects fit within the face without overlapping neighbors.
 */
export function autoResizeEmittersToFitFace(
  sourceEmitters: FixtureEmitterDefinition[],
  targetPositions: { x: number; y: number }[],
  faceWidthM: number,
  faceHeightM: number
): FixtureEmitterDefinition[] {
  if (sourceEmitters.length !== targetPositions.length) {
    return sourceEmitters
  }
  const shortSpan = Math.min(faceWidthM, faceHeightM)
  const faceCapDiameter = shortSpan * (1 - 2 * AUTO_EMITTER_FACE_EDGE_RATIO)
  return sourceEmitters.map((emitter, index) => {
    const target = targetPositions[index]
    const nearest = nearestEmitterNeighborDistanceM(
      targetPositions,
      index,
      faceWidthM,
      faceHeightM
    )
    const spacingDiameter = nearest * (1 - AUTO_EMITTER_FACE_PACKING_RATIO)
    const diameterM = clampEmitterDiameterM(
      Math.max(
        EMITTER_DIAMETER_MIN_M,
        Math.min(faceCapDiameter, spacingDiameter)
      )
    )
    if (emitter.shape === 'disc') {
      return {
        ...emitter,
        x: clampNormalized(target.x),
        y: clampNormalized(target.y),
        size: diameterM,
      }
    }
    const shortM = clampRectFaceExtentM(diameterM * 0.34)
    if (emitter.shape === 'rect-h') {
      return {
        ...emitter,
        x: clampNormalized(target.x),
        y: clampNormalized(target.y),
        size: diameterM,
        rectWidthM: clampRectFaceExtentM(diameterM * 1.12),
        rectHeightM: shortM,
      }
    }
    return {
      ...emitter,
      x: clampNormalized(target.x),
      y: clampNormalized(target.y),
      size: diameterM,
      rectWidthM: shortM,
      rectHeightM: clampRectFaceExtentM(diameterM * 1.12),
    }
  })
}

function rectFaceMFromLegacyDimensionlessSize(
  legacySize: number,
  orientation: 'horizontal' | 'vertical'
): { widthM: number; heightM: number } {
  const d = normalizeEmitterDiameterM(legacySize)
  const scale = d / EMITTER_DIAMETER_REFERENCE_M
  const longM = Math.max(EMITTER_DIAMETER_MIN_M, 0.05 * scale)
  const shortM = Math.max(EMITTER_DIAMETER_MIN_M, 0.016 * scale)
  return orientation === 'horizontal'
    ? {
        widthM: clampRectFaceExtentM(longM),
        heightM: clampRectFaceExtentM(shortM),
      }
    : {
        widthM: clampRectFaceExtentM(shortM),
        heightM: clampRectFaceExtentM(longM),
      }
}

export function defaultEmitterDiameterMParCylinderRing(
  n: number,
  bodyDiameterM: number
): number {
  if (n <= 1) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  const R = 0.38 * bodyDiameterM * PAR_EMITTER_VISUAL_FACE_SCALE
  const chord = 2 * R * Math.sin(Math.PI / n)
  return clampEmitterDiameterM(chord * PAR_EMITTER_FACE_FILL_RATIO)
}

export function defaultEmitterDiameterMParCylinderHoneycomb(
  n: number,
  bodyDiameterM: number
): number {
  if (n <= 1) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  const rNorm = 0.44
  const R = rNorm * bodyDiameterM * PAR_EMITTER_VISUAL_FACE_SCALE
  const area = Math.PI * R * R
  const per = area / Math.max(1, n)
  const dFromArea = Math.sqrt((4 * per) / Math.PI)
  return clampEmitterDiameterM(
    dFromArea * PAR_EMITTER_FACE_FILL_RATIO * 0.93
  )
}

export function defaultEmitterDiameterMParBoxLine(
  n: number,
  widthM: number
): number {
  if (n <= 1) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  const usable = Math.max(
    0.01,
    widthM * PAR_EMITTER_VISUAL_FACE_SCALE - 0.06
  )
  const spacing = usable / Math.max(1, n - 1)
  return clampEmitterDiameterM(spacing * PAR_EMITTER_FACE_FILL_RATIO)
}

export function defaultEmitterDiameterMParBoxGrid(
  n: number,
  widthM: number,
  heightM: number
): number {
  if (n <= 1) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const usableW = Math.max(
    0.01,
    widthM * PAR_EMITTER_VISUAL_FACE_SCALE - 0.06
  )
  const usableH = Math.max(
    0.01,
    heightM * PAR_EMITTER_VISUAL_FACE_SCALE - 0.06
  )
  const sx = cols <= 1 ? usableW : usableW / (cols - 1)
  const sy = rows <= 1 ? usableH : usableH / (rows - 1)
  return clampEmitterDiameterM(
    Math.min(sx, sy) * PAR_EMITTER_FACE_FILL_RATIO
  )
}

const PAR_NORM_MARGIN = 0.07
const PAR_EMITTER_Z = 0.72
const EMITTER_CENTER_GAP_M = 0.085
const EMITTER_FACE_MARGIN_M = 0.03

function makeParEmitter(
  x: number,
  y: number,
  z: number,
  fallbackChannelIndex: number,
  maxChannelIndex: number,
  sizeDiameterM: number = EMITTER_DEFAULT_DIAMETER_M
): FixtureEmitterDefinition {
  const safeChannel =
    maxChannelIndex >= 0
      ? Math.max(0, Math.min(maxChannelIndex, fallbackChannelIndex))
      : 0
  return {
    id: nanoid(),
    x: clampNormalized(x),
    y: clampNormalized(y),
    z: clampNormalized(z),
    shape: 'disc',
    size: clampEmitterDiameterM(sizeDiameterM),
    channelIndexes: maxChannelIndex >= 0 ? [safeChannel] : [],
  }
}

/**
 * Pointy-top hex grid in normalized face space, centered at (cx, cy).
 * Axial coordinates (q, r) give 6-fold symmetry around the face center.
 * `spacing` is center-to-center distance between nearest neighbors (same units as x,y).
 */
function hexAxialToNormXY(
  q: number,
  r: number,
  spacing: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const x = cx + spacing * (q + r / 2)
  const y = cy + spacing * (Math.sqrt(3) / 2) * r
  return { x, y }
}

function hexLatticeAxialPointsInCircle(
  cx: number,
  cy: number,
  radius: number,
  spacing: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  const maxAxial = Math.ceil((2 * radius) / Math.max(0.001, spacing)) + 2
  for (let q = -maxAxial; q <= maxAxial; q++) {
    for (let r = -maxAxial; r <= maxAxial; r++) {
      const { x, y } = hexAxialToNormXY(q, r, spacing, cx, cy)
      if (Math.hypot(x - cx, y - cy) <= radius - 0.012) {
        pts.push({ x: clampNormalized(x), y: clampNormalized(y) })
      }
    }
  }
  return pts
}

/** Sort by radius then angle so the pattern reads outward symmetrically from the center. */
function orderHoneycombRadialSymmetric(
  pts: { x: number; y: number }[],
  cx: number,
  cy: number
): { x: number; y: number }[] {
  if (pts.length <= 1) {
    return [...pts]
  }
  return [...pts].sort((a, b) => {
    const ra = Math.hypot(a.x - cx, a.y - cy)
    const rb = Math.hypot(b.x - cx, b.y - cy)
    if (Math.abs(ra - rb) > 1e-7) {
      return ra - rb
    }
    return (
      Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    )
  })
}

function pickHoneycombPositions(
  cx: number,
  cy: number,
  radius: number,
  n: number
): { ordered: { x: number; y: number }[]; dx: number } {
  let spacing = 0.26
  let pts: { x: number; y: number }[] = []
  for (let attempt = 0; attempt < 72; attempt++) {
    pts = hexLatticeAxialPointsInCircle(cx, cy, radius, spacing)
    if (pts.length >= n) {
      break
    }
    spacing *= 0.92
  }
  if (pts.length < n) {
    spacing = 0.04
    pts = hexLatticeAxialPointsInCircle(cx, cy, radius, spacing)
  }
  const ordered = orderHoneycombRadialSymmetric(pts, cx, cy)
  return { ordered, dx: spacing }
}

/** Normalized (0–1) PAR ring positions for `n` emitters on the round face. */
export function normalizedParRingEmitterPositions(
  n: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return []
  }
  const rx = 0.42
  const ry = 0.42
  if (n === 1) {
    return [{ x: 0.5, y: 0.5 }]
  }
  return Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n - Math.PI / 2
    return {
      x: clampNormalized(0.5 + rx * Math.cos(t)),
      y: clampNormalized(0.5 + ry * Math.sin(t)),
    }
  })
}

/** Normalized honeycomb on the round face (axial hex lattice, clipped to disk). */
export function normalizedParHoneycombEmitterPositions(
  n: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return []
  }
  if (n === 1) {
    return [{ x: 0.5, y: 0.5 }]
  }
  const cx = 0.5
  const cy = 0.5
  const R = 0.44
  const { ordered } = pickHoneycombPositions(cx, cy, R, n)
  return ordered.slice(0, n)
}

/** Normalized single-row positions on the PAR box face. */
export function normalizedParBoxLineEmitterPositions(
  n: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return []
  }
  const m = PAR_NORM_MARGIN
  if (n === 1) {
    return [{ x: 0.5, y: 0.5 }]
  }
  return Array.from({ length: n }, (_, i) => ({
    x: clampNormalized(m + (i / (n - 1)) * (1 - 2 * m)),
    y: clampNormalized(0.5),
  }))
}

/** Normalized grid positions on the PAR box face (same packing as layout tools). */
export function normalizedParBoxGridEmitterPositions(
  n: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return []
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const m = PAR_NORM_MARGIN
  const gx = cols === 1 ? 0 : (1 - 2 * m) / (cols - 1)
  const gy = rows === 1 ? 0 : (1 - 2 * m) / (rows - 1)
  const positions: { x: number; y: number }[] = []
  let k = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (k >= n) {
        break
      }
      const x = cols === 1 ? 0.5 : m + c * gx
      const y = rows === 1 ? 0.5 : m + r * gy
      positions.push({ x: clampNormalized(x), y: clampNormalized(y) })
      k++
    }
  }
  return positions
}

function buildParCylinderHoneycomb(
  n: number,
  maxChannelIndex: number,
  bodyDiameterM: number
): FixtureEmitterDefinition[] {
  if (n <= 0) return []
  const dM = defaultEmitterDiameterMParCylinderHoneycomb(n, bodyDiameterM)
  if (n === 1) {
    return [
      makeParEmitter(0.5, 0.5, PAR_EMITTER_Z, 0, maxChannelIndex, dM),
    ]
  }
  const positions = normalizedParHoneycombEmitterPositions(n)
  return positions.map((p, i) =>
    makeParEmitter(p.x, p.y, PAR_EMITTER_Z, i, maxChannelIndex, dM)
  )
}

function buildParCylinderRing(
  n: number,
  maxChannelIndex: number,
  bodyDiameterM: number
): FixtureEmitterDefinition[] {
  if (n <= 0) return []
  const dM = defaultEmitterDiameterMParCylinderRing(n, bodyDiameterM)
  if (n === 1) {
    return [
      makeParEmitter(0.5, 0.5, PAR_EMITTER_Z, 0, maxChannelIndex, dM),
    ]
  }
  const rx = 0.38
  const ry = 0.38
  return Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n - Math.PI / 2
    const x = clampNormalized(0.5 + rx * Math.cos(t))
    const y = clampNormalized(0.5 + ry * Math.sin(t))
    return makeParEmitter(x, y, PAR_EMITTER_Z, i, maxChannelIndex, dM)
  })
}

function buildParBoxLine(
  n: number,
  maxChannelIndex: number,
  widthM: number
): FixtureEmitterDefinition[] {
  const m = PAR_NORM_MARGIN
  if (n <= 0) return []
  const dM = defaultEmitterDiameterMParBoxLine(n, widthM)
  if (n === 1) {
    return [
      makeParEmitter(0.5, 0.5, PAR_EMITTER_Z, 0, maxChannelIndex, dM),
    ]
  }
  return Array.from({ length: n }, (_, i) => {
    const x = m + (i / (n - 1)) * (1 - 2 * m)
    return makeParEmitter(x, 0.5, PAR_EMITTER_Z, i, maxChannelIndex, dM)
  })
}

function buildParBoxGrid(
  n: number,
  maxChannelIndex: number,
  widthM: number,
  heightM: number
): FixtureEmitterDefinition[] {
  if (n <= 0) return []
  const dM = defaultEmitterDiameterMParBoxGrid(n, widthM, heightM)
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const m = PAR_NORM_MARGIN
  const gx = cols === 1 ? 0 : (1 - 2 * m) / (cols - 1)
  const gy = rows === 1 ? 0 : (1 - 2 * m) / (rows - 1)
  const out: FixtureEmitterDefinition[] = []
  let k = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (k >= n) break
      const x = cols === 1 ? 0.5 : m + c * gx
      const y = rows === 1 ? 0.5 : m + r * gy
      out.push(makeParEmitter(x, y, PAR_EMITTER_Z, k, maxChannelIndex, dM))
      k++
    }
  }
  return out
}

/** Honeycomb on the round front face; preserves ids/channels/z/size/shape. */
export function layoutEmittersParHoneycomb(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const chosen = normalizedParHoneycombEmitterPositions(n)
  return emitters.map((em, i) => {
    const p = chosen[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
}

/** Single row on the rectangular face; preserves emitter metadata. */
export function layoutEmittersParBoxLine(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const positions = normalizedParBoxLineEmitterPositions(n)
  return emitters.map((em, i) => {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
}

/** Rows and columns on the rectangular face; preserves emitter metadata. */
export function layoutEmittersParBoxGrid(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const positions = normalizedParBoxGridEmitterPositions(n)
  return emitters.map((em, i) => {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
}

export function minParBoxWidthM(
  n: number,
  layout: ParRectLayoutMode
): number {
  if (n <= 1) return PAR_DEFAULT_BOX_WIDTH_M
  if (layout === 'line') {
    return Math.max(
      PAR_DEFAULT_BOX_WIDTH_M,
      (n - 1) * EMITTER_CENTER_GAP_M + 2 * EMITTER_FACE_MARGIN_M
    )
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const wNeed = (cols - 1) * EMITTER_CENTER_GAP_M + 2 * EMITTER_FACE_MARGIN_M
  return Math.max(PAR_DEFAULT_BOX_WIDTH_M, wNeed)
}

export function minParBoxHeightM(
  n: number,
  layout: ParRectLayoutMode
): number {
  if (layout !== 'grid' || n <= 1) return PAR_DEFAULT_BOX_HEIGHT_M
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const hNeed = (rows - 1) * EMITTER_CENTER_GAP_M + 2 * EMITTER_FACE_MARGIN_M
  return Math.max(PAR_DEFAULT_BOX_HEIGHT_M, hNeed)
}

export function minParCylinderDiameterM(
  n: number,
  layout: ParCylinderLayoutMode
): number {
  if (n <= 1) return PAR_DEFAULT_CYLINDER_DIAMETER_M
  if (layout === 'ring') {
    const circumference = n * EMITTER_CENTER_GAP_M
    const d = circumference / Math.PI + 2 * EMITTER_FACE_MARGIN_M
    return Math.max(PAR_DEFAULT_CYLINDER_DIAMETER_M, d)
  }
  const est = Math.sqrt(Math.max(1, n)) * EMITTER_CENTER_GAP_M * 1.2 + 2 * EMITTER_FACE_MARGIN_M
  return Math.max(PAR_DEFAULT_CYLINDER_DIAMETER_M, est)
}

export function defaultBodyShapeForKind(kind: FixtureModelKind): FixtureBodyShape {
  if (kind === 'parCan' || kind === 'moverSpot' || kind === 'moverWash') {
    return 'cylinder'
  }
  return 'box'
}

function defaultBodyHeightForKind(
  kind: FixtureModelKind,
  bodyShape: FixtureBodyShape
): number {
  if (kind === 'parCan') {
    return bodyShape === 'cylinder'
      ? PAR_DEFAULT_CYLINDER_DIAMETER_M
      : PAR_DEFAULT_BOX_HEIGHT_M
  }
  if (kind === 'washBar') return 0.074
  if (kind === 'uplight') return 0.24
  if (kind === 'atmosphericFx') return 0.22
  if (kind === 'moverSpot' || kind === 'moverWash') return 0.18
  return 0.3
}

function defaultBodyDepthForKind(kind: FixtureModelKind): number {
  if (kind === 'parCan') return PAR_DEFAULT_CYLINDER_DEPTH_M
  if (kind === 'washBar') return 0.061
  if (kind === 'uplight') return 0.3
  if (kind === 'atmosphericFx') return 0.32
  if (kind === 'moverSpot' || kind === 'moverWash') return 0.24
  return 0.34
}

function defaultBodyDiameterForKind(
  kind: FixtureModelKind,
  bodyShape: FixtureBodyShape
): number {
  if (kind === 'moverSpot' || kind === 'moverWash') return 0.6
  if (kind === 'parCan') {
    return bodyShape === 'cylinder'
      ? PAR_DEFAULT_CYLINDER_DIAMETER_M
      : Math.max(PAR_DEFAULT_BOX_WIDTH_M, PAR_DEFAULT_BOX_HEIGHT_M)
  }
  return 0.45
}

function sanitizeEmitterChannels(
  raw: unknown,
  maxChannelIndex: number
): number[] {
  if (!Array.isArray(raw) || maxChannelIndex < 0) {
    return []
  }
  const out = new Set<number>()
  for (const value of raw) {
    const index = Number(value)
    if (!Number.isFinite(index)) continue
    const channelIndex = Math.round(index)
    if (channelIndex < 0 || channelIndex > maxChannelIndex) continue
    out.add(channelIndex)
  }
  return Array.from(out)
}

function defaultEmitterCountForFixture(
  fixtureType: FixtureType,
  normalizedKind: FixtureModelKind,
  emittersPerSubFixture: number,
  washBarLayoutMode: WashBarLayoutMode,
  washBarRgbCount: number,
  washBarCoolWhiteCount: number,
  washBarWarmWhiteCount: number
): number {
  if (normalizedKind === 'moverSpot') return 1
  if (normalizedKind === 'moverWash') return 7
  if (normalizedKind === 'washBar' && washBarLayoutMode === 'multiStrip') {
    return washBarRgbCount * 2 + washBarCoolWhiteCount + washBarWarmWhiteCount
  }
  const subFixtureCount = fixtureType.subFixtures.length > 0 ? fixtureType.subFixtures.length : 1
  return Math.max(1, Math.min(256, subFixtureCount * emittersPerSubFixture))
}

function buildDefaultCustomEmitters(
  fixtureType: FixtureType,
  normalizedKind: FixtureModelKind,
  emittersPerSubFixture: number,
  washBarLayoutMode: WashBarLayoutMode,
  washBarRgbCount: number,
  washBarCoolWhiteCount: number,
  washBarWarmWhiteCount: number,
  parContext?: {
    bodyShape: FixtureBodyShape
    parRectLayout: ParRectLayoutMode
    parCylinderLayout: ParCylinderLayoutMode
    bodyDiameterM: number
    boxWidthM: number
    boxHeightM: number
  }
): FixtureEmitterDefinition[] {
  const channelCount = fixtureType.channels.length
  const maxChannelIndex = channelCount - 1
  const emitters: FixtureEmitterDefinition[] = []

  const pushEmitter = (
    x: number,
    y: number,
    z: number,
    shape: FixtureEmitterShape,
    size: number,
    fallbackChannelIndex: number,
    rectFace?: { widthM: number; heightM: number }
  ) => {
    const safeChannel =
      maxChannelIndex >= 0
        ? Math.max(0, Math.min(maxChannelIndex, fallbackChannelIndex))
        : 0
    const row: FixtureEmitterDefinition = {
      id: nanoid(),
      x: clampNormalized(x),
      y: clampNormalized(y),
      z: clampNormalized(z),
      shape,
      size: normalizeEmitterDiameterM(size),
      channelIndexes: maxChannelIndex >= 0 ? [safeChannel] : [],
    }
    if (
      rectFace !== undefined &&
      (shape === 'rect-h' || shape === 'rect-v')
    ) {
      row.rectWidthM = clampRectFaceExtentM(rectFace.widthM)
      row.rectHeightM = clampRectFaceExtentM(rectFace.heightM)
    }
    emitters.push(row)
  }

  if (normalizedKind === 'washBar' && washBarLayoutMode === 'multiStrip') {
    const rgbFace = rectFaceMFromLegacyDimensionlessSize(0.8, 'horizontal')
    const cwFace = rectFaceMFromLegacyDimensionlessSize(0.85, 'vertical')
    for (let i = 0; i < washBarRgbCount; i++) {
      const t = washBarRgbCount <= 1 ? 0.5 : i / (washBarRgbCount - 1)
      pushEmitter(t, 0.16, 0.65, 'rect-h', 0.8, i, rgbFace)
      pushEmitter(t, 0.84, 0.65, 'rect-h', 0.8, i, rgbFace)
    }
    for (let i = 0; i < washBarWarmWhiteCount; i++) {
      const t = washBarWarmWhiteCount <= 1 ? 0.5 : i / (washBarWarmWhiteCount - 1)
      pushEmitter(t, 0.5, 0.7, 'disc', 1.1, i)
    }
    for (let i = 0; i < washBarCoolWhiteCount; i++) {
      const t = washBarCoolWhiteCount <= 1 ? 0.5 : i / (washBarCoolWhiteCount - 1)
      pushEmitter(t, 0.5, 0.72, 'rect-v', 0.85, i, cwFace)
    }
    return emitters
  }

  const count = defaultEmitterCountForFixture(
    fixtureType,
    normalizedKind,
    emittersPerSubFixture,
    washBarLayoutMode,
    washBarRgbCount,
    washBarCoolWhiteCount,
    washBarWarmWhiteCount
  )

  if (normalizedKind === 'parCan' && parContext !== undefined) {
    const {
      bodyShape,
      parRectLayout,
      parCylinderLayout,
      bodyDiameterM,
      boxWidthM,
      boxHeightM,
    } = parContext
    if (bodyShape === 'cylinder') {
      return parCylinderLayout === 'ring'
        ? buildParCylinderRing(count, maxChannelIndex, bodyDiameterM)
        : buildParCylinderHoneycomb(count, maxChannelIndex, bodyDiameterM)
    }
    return parRectLayout === 'line'
      ? buildParBoxLine(count, maxChannelIndex, boxWidthM)
      : buildParBoxGrid(count, maxChannelIndex, boxWidthM, boxHeightM)
  }

  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0.5 : i / (count - 1)
    const y =
      normalizedKind === 'uplight'
        ? 0.25
        : normalizedKind === 'moverSpot' || normalizedKind === 'moverWash'
        ? 0.5
        : 0.5
    pushEmitter(
      t,
      y,
      normalizedKind === 'moverSpot' || normalizedKind === 'moverWash' ? 0.95 : 0.72,
      'disc',
      EMITTER_DEFAULT_DIAMETER_M,
      i
    )
  }
  return emitters
}

/**
 * Default emitter layout for the fixture model: canonical positions from
 * `buildDefaultCustomEmitters`, then face-aware sizing so emitters stay inside the
 * opening and do not overlap (used when custom WYSIWYG layout is off, and as the
 * baseline when custom emitters are empty in saves).
 */
export function buildAutoFittedDefaultCustomEmitters(
  fixtureType: FixtureType,
  model: FixtureModelConfig
): FixtureEmitterDefinition[] {
  const normalizedKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const parContext =
    normalizedKind === 'parCan'
      ? {
          bodyShape: model.bodyShape,
          parRectLayout: model.parRectLayout,
          parCylinderLayout: model.parCylinderLayout,
          bodyDiameterM: model.bodyDiameter,
          boxWidthM: model.width,
          boxHeightM: model.bodyHeight,
        }
      : undefined
  const raw = buildDefaultCustomEmitters(
    fixtureType,
    normalizedKind,
    model.emittersPerSubFixture,
    model.washBarLayoutMode,
    model.washBarRgbCount,
    model.washBarCoolWhiteCount,
    model.washBarWarmWhiteCount,
    parContext
  )
  const dims = fixtureFrontFaceDimensionsM(model)
  return autoResizeEmittersToFitFace(
    raw,
    raw.map((e) => ({ x: e.x, y: e.y })),
    dims.faceWidthM,
    dims.faceHeightM
  )
}

export type FixtureType = {
  id: string
  name: string
  intensity: number
  manufacturer?: string
  channels: FixtureChannel[]
  subFixtures: SubFixture[]
  groups: string[]
  moverCalibration?: MoverCalibration
  model?: FixtureModelConfig
}

export function initFixtureType(): FixtureType {
  return {
    id: nanoid(),
    name: 'Name',
    manufacturer: 'Manufacturer',
    intensity: 0,
    channels: [initFixtureChannel()],
    subFixtures: [],
    groups: [],
    moverCalibration: undefined,
    model: initFixtureModelConfig(),
  }
}

export function isMoverFixtureType(fixtureType: FixtureType): boolean {
  const leafChannels = fixtureType.channels.flatMap((channel) =>
    fixtureChannelLeafChannels(channel)
  )
  const hasPan = leafChannels.some(
    (channel) => channel.type === 'axis' && channel.dir === 'x' && !channel.isFine
  )
  const hasTilt = leafChannels.some(
    (channel) => channel.type === 'axis' && channel.dir === 'y' && !channel.isFine
  )
  return hasPan && hasTilt
}

/** True if any mapped universe fixture uses a mover-style fixture type (pan+tilt head). */
export function hasMoverFixtureInUniverse(
  universe: Universe,
  fixtureTypesByID: { [id: string]: FixtureType | undefined }
): boolean {
  for (const fixture of universe) {
    const fixtureType = fixtureTypesByID[fixture.type]
    if (fixtureType !== undefined && isMoverFixtureType(fixtureType)) {
      return true
    }
  }
  return false
}

export function fixtureTypeHasFocusChannel(fixtureType: FixtureType): boolean {
  return fixtureType.channels.flatMap((channel) =>
    fixtureChannelLeafChannels(channel)
  ).some(
    (channel) =>
      channel.type === 'custom' &&
      channel.name.trim().toLowerCase().includes('focus')
  )
}

export function inferFixtureModelKind(fixtureType: FixtureType): FixtureModelKind {
  const hasAtmosFxChannels = fixtureType.channels.flatMap((channel) =>
    fixtureChannelLeafChannels(channel)
  ).some(
    (channel) => channel.type === 'fxTrigger' || channel.type === 'fxLevel'
  )
  if (hasAtmosFxChannels) {
    return 'atmosphericFx'
  }

  if (isMoverFixtureType(fixtureType)) {
    return 'moverSpot'
  }

  const lowerName = fixtureType.name.toLowerCase()
  if (lowerName.includes('uplight') || lowerName.includes('up light')) {
    return 'uplight'
  }

  if (fixtureType.subFixtures.length >= 3) {
    return 'washBar'
  }

  return 'parCan'
}

export function normalizeFixtureModelConfig(
  config: unknown,
  fixtureType: FixtureType
): FixtureModelConfig {
  const defaults = initFixtureModelConfig()
  const source =
    config !== null && typeof config === 'object'
      ? (config as {
          kind?: unknown
          emittersPerSubFixture?: unknown
          width?: unknown
          bodyShape?: unknown
          bodyHeight?: unknown
          bodyDepth?: unknown
          bodyDiameter?: unknown
          moverBeamAngleDeg?: unknown
          atmosphereEffect?: unknown
          atmosphereNozzleDirection?: unknown
          washBarLayoutMode?: unknown
          washBarWarmWhiteCount?: unknown
          washBarCoolWhiteCount?: unknown
          washBarRgbCount?: unknown
          useCustomEmitterLayout?: unknown
          customEmitters?: unknown
          emitterFaceAutoSize?: unknown
          parRectLayout?: unknown
          parCylinderLayout?: unknown
        })
      : {}

  const kind =
    typeof source.kind === 'string' &&
    fixtureModelKinds.includes(source.kind as FixtureModelKind)
      ? (source.kind as FixtureModelKind)
      : defaults.kind

  const normalizedKind = kind === 'auto' ? inferFixtureModelKind(fixtureType) : kind

  const defaultEmitters =
    normalizedKind === 'washBar'
      ? 4
      : normalizedKind === 'moverWash'
      ? 7
      : normalizedKind === 'atmosphericFx'
      ? 1
      : 1

  const bodyShape: FixtureBodyShape =
    source.bodyShape === 'box' || source.bodyShape === 'cylinder'
      ? source.bodyShape
      : defaultBodyShapeForKind(normalizedKind)

  const emitterFaceAutoSize = source.emitterFaceAutoSize === false ? false : true

  const parRectLayout: ParRectLayoutMode =
    source.parRectLayout === 'line' ? 'line' : 'grid'

  const parCylinderLayout: ParCylinderLayoutMode =
    source.parCylinderLayout === 'ring' ? 'ring' : 'honeycomb'

  const defaultWidth =
    normalizedKind === 'washBar'
      ? 2.2
      : normalizedKind === 'atmosphericFx'
      ? 0.6
      : normalizedKind === 'parCan'
      ? bodyShape === 'cylinder'
        ? PAR_DEFAULT_CYLINDER_DIAMETER_M
        : PAR_DEFAULT_BOX_WIDTH_M
      : normalizedKind === 'uplight'
      ? 0.45
      : 0.6
  const defaultMoverBeamAngleDeg =
    defaultMoverBeamAngleForModelKind(normalizedKind)

  const fixedEmitterCount = fixedEmitterCountForModelKind(normalizedKind)
  const requestedEmitters = clampModelEmitters(
    Number(source.emittersPerSubFixture ?? defaultEmitters)
  )
  const atmosphereEffect: AtmosphereEffectType =
    source.atmosphereEffect === 'haze' ||
    source.atmosphereEffect === 'co2' ||
    source.atmosphereEffect === 'bubble' ||
    source.atmosphereEffect === 'confetti' ||
    source.atmosphereEffect === 'flame'
      ? source.atmosphereEffect
      : 'fog'
  const atmosphereNozzleDirection: AtmosphereNozzleDirection =
    source.atmosphereNozzleDirection === 'forward' ? 'forward' : 'up'
  const washBarLayoutMode: WashBarLayoutMode =
    source.washBarLayoutMode === 'multiStrip' ? 'multiStrip' : 'linear'
  const washBarWarmWhiteCount = clampModelEmitters(
    Number(source.washBarWarmWhiteCount ?? defaults.washBarWarmWhiteCount)
  )
  const washBarCoolWhiteCount = clampModelEmitters(
    Number(source.washBarCoolWhiteCount ?? defaults.washBarCoolWhiteCount)
  )
  const washBarRgbCount = clampModelEmitters(
    Number(source.washBarRgbCount ?? defaults.washBarRgbCount)
  )
  const maxChannelIndex = fixtureType.channels.length - 1
  const customEmittersSource = Array.isArray(source.customEmitters)
    ? source.customEmitters
    : []
  const normalizedCustomEmitters = customEmittersSource
    .map((rawEmitter) => {
      if (rawEmitter === null || typeof rawEmitter !== 'object') {
        return null
      }
      const emitter = rawEmitter as {
        id?: unknown
        x?: unknown
        y?: unknown
        z?: unknown
        size?: unknown
        shape?: unknown
        channelIndexes?: unknown
        rectWidthM?: unknown
        rectHeightM?: unknown
      }
      const shape: FixtureEmitterShape =
        emitter.shape === 'rect-h' || emitter.shape === 'rect-v'
          ? emitter.shape
          : 'disc'
      const baseSize = normalizeEmitterDiameterM(
        emitter.size ?? EMITTER_DEFAULT_DIAMETER_M
      )
      const rw = Number(emitter.rectWidthM)
      const rh = Number(emitter.rectHeightM)
      const hasBothRectDims =
        (shape === 'rect-h' || shape === 'rect-v') &&
        Number.isFinite(rw) &&
        Number.isFinite(rh) &&
        rw >= EMITTER_DIAMETER_MIN_M &&
        rh >= EMITTER_DIAMETER_MIN_M
      const row: FixtureEmitterDefinition = {
        id:
          typeof emitter.id === 'string' && emitter.id.trim().length > 0
            ? emitter.id
            : nanoid(),
        x: clampNormalized(Number(emitter.x)),
        y: clampNormalized(Number(emitter.y)),
        z: clampNormalized(Number(emitter.z)),
        size: baseSize,
        shape,
        channelIndexes: sanitizeEmitterChannels(emitter.channelIndexes, maxChannelIndex),
      }
      if (hasBothRectDims) {
        row.rectWidthM = clampRectFaceExtentM(rw)
        row.rectHeightM = clampRectFaceExtentM(rh)
      }
      return row
    })
    .filter((value): value is FixtureEmitterDefinition => value !== null)

  const useCustomEmitterLayout =
    source.useCustomEmitterLayout === false ? false : true

  let widthM = clampModelWidth(Number(source.width ?? defaultWidth))
  let bodyHeightM = clampModelDimension(
    Number(source.bodyHeight ?? defaultBodyHeightForKind(normalizedKind, bodyShape)),
    defaultBodyHeightForKind(normalizedKind, bodyShape)
  )
  let bodyDepthM = clampModelDimension(
    Number(source.bodyDepth ?? defaultBodyDepthForKind(normalizedKind)),
    defaultBodyDepthForKind(normalizedKind)
  )
  let bodyDiameterM = clampModelDimension(
    Number(source.bodyDiameter ?? defaultBodyDiameterForKind(normalizedKind, bodyShape)),
    defaultBodyDiameterForKind(normalizedKind, bodyShape)
  )

  const emitterCountForPar = defaultEmitterCountForFixture(
    fixtureType,
    normalizedKind,
    fixedEmitterCount ?? requestedEmitters,
    washBarLayoutMode,
    washBarRgbCount,
    washBarCoolWhiteCount,
    washBarWarmWhiteCount
  )

  if (
    normalizedKind === 'parCan' &&
    emitterFaceAutoSize &&
    emitterCountForPar > 1
  ) {
    if (bodyShape === 'box') {
      const wNeed = minParBoxWidthM(emitterCountForPar, parRectLayout)
      const hNeed = minParBoxHeightM(emitterCountForPar, parRectLayout)
      widthM = clampModelWidth(Math.max(widthM, wNeed))
      bodyHeightM = clampModelDimension(
        Math.max(bodyHeightM, hNeed),
        defaultBodyHeightForKind(normalizedKind, bodyShape)
      )
    } else {
      const dNeed = minParCylinderDiameterM(
        emitterCountForPar,
        parCylinderLayout
      )
      bodyDiameterM = clampModelDimension(
        Math.max(bodyDiameterM, dNeed),
        defaultBodyDiameterForKind(normalizedKind, bodyShape)
      )
      widthM = clampModelWidth(Math.max(widthM, bodyDiameterM))
      bodyHeightM = clampModelDimension(
        Math.max(bodyHeightM, bodyDiameterM),
        defaultBodyHeightForKind(normalizedKind, bodyShape)
      )
    }
  }

  if (normalizedKind === 'parCan' && bodyShape === 'cylinder') {
    widthM = clampModelWidth(bodyDiameterM)
    bodyHeightM = clampModelDimension(
      bodyDiameterM,
      defaultBodyHeightForKind(normalizedKind, bodyShape)
    )
  }

  const defaultCustomEmittersRaw = buildDefaultCustomEmitters(
    fixtureType,
    normalizedKind,
    fixedEmitterCount ?? requestedEmitters,
    washBarLayoutMode,
    washBarRgbCount,
    washBarCoolWhiteCount,
    washBarWarmWhiteCount,
    normalizedKind === 'parCan'
      ? {
          bodyShape,
          parRectLayout,
          parCylinderLayout,
          bodyDiameterM,
          boxWidthM: widthM,
          boxHeightM: bodyHeightM,
        }
      : undefined
  )
  const faceDimsForDefaults = fixtureFrontFaceDimensionsM({
    bodyShape,
    width: widthM,
    bodyHeight: bodyHeightM,
    bodyDiameter: bodyDiameterM,
  })
  const defaultCustomEmitters = autoResizeEmittersToFitFace(
    defaultCustomEmittersRaw,
    defaultCustomEmittersRaw.map((e) => ({ x: e.x, y: e.y })),
    faceDimsForDefaults.faceWidthM,
    faceDimsForDefaults.faceHeightM
  )
  const customEmitters =
    normalizedCustomEmitters.length > 0 ? normalizedCustomEmitters : defaultCustomEmitters

  return {
    kind,
    emittersPerSubFixture: fixedEmitterCount ?? requestedEmitters,
    width: widthM,
    bodyShape,
    bodyHeight: bodyHeightM,
    bodyDepth: bodyDepthM,
    bodyDiameter: bodyDiameterM,
    moverBeamAngleDeg: clampMoverBeamAngle(
      Number(source.moverBeamAngleDeg ?? defaultMoverBeamAngleDeg)
    ),
    atmosphereEffect,
    atmosphereNozzleDirection,
    washBarLayoutMode,
    washBarWarmWhiteCount,
    washBarCoolWhiteCount,
    washBarRgbCount,
    useCustomEmitterLayout,
    customEmitters,
    emitterFaceAutoSize,
    parRectLayout,
    parCylinderLayout,
  }
}

export interface Fixture {
  id?: string
  name?: string
  ch: number
  universe: number
  type: string // FixtureType id
  window: Window2D_t
  rotation?: FixtureRotation
  groups: string[]
  moverBounds?: MoverBounds
  moverMountOrientation?: MoverMountOrientation
}

export type Universe = Fixture[]

export type SubFixture = {
  name: string
  intensity?: number
  channels: number[] // Channel indexes from the parent fixture
  relative_window?: Window2D_t
  groups: string[]
}

export function initSubFixture(): SubFixture {
  return {
    name: 'Name',
    channels: [],
    groups: [],
  }
}

export type FlattenedFixture = {
  intensity: number
  channels: [number, FixtureChannel][]
  window: Window2D_t
  hasMasterChannelInFixtureType?: boolean
  groups: string[]
  fixtureId?: string
  fixtureTypeId?: string
  moverGroup?: string
  moverCalibration?: MoverCalibration
  moverBounds?: MoverBounds
  moverMountOrientation?: MoverMountOrientation
}




