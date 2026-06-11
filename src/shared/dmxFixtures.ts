import {
  Window2D_t,
  WindowAxis,
  window2DToParentCoords,
  windowAxes,
} from './window'
import { ColorChannel, ColorKind } from './dmxColors'
import { METERS_PER_FOOT, StageDimensions, stageAxisLengthFt } from './stage'
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

/** DMX slots used by a fixture type (parent channels + highest subfixture channel index). */
export function fixtureDmxFootprintChannelCount(fixtureType: FixtureType): number {
  let footprint = fixtureType.channels.length
  for (const sub of fixtureType.subFixtures) {
    for (const chIndex of sub.channels) {
      if (Number.isFinite(chIndex) && chIndex >= 0) {
        footprint = Math.max(footprint, Math.floor(chIndex) + 1)
      }
    }
  }
  return footprint
}

/**
 * Forces every address not covered by a patched fixture footprint to 0.
 * Prevents noise on physical fixtures sitting in intentional universe gaps.
 */
export function zeroUnpatchedDmxChannels(
  universeFixtures: Fixture[],
  fixtureTypesByID: { [id: string]: FixtureType | undefined },
  channels: number[]
): void {
  const patched = new Uint8Array(DMX_NUM_CHANNELS)
  for (const fixture of universeFixtures) {
    const ft = fixtureTypesByID[fixture.type]
    if (ft === undefined) continue
    const startOneBased = Math.round(fixture.ch)
    if (!Number.isFinite(startOneBased) || startOneBased < 1) continue
    const start = startOneBased - 1
    const count = fixtureDmxFootprintChannelCount(ft)
    for (let i = 0; i < count; i++) {
      const idx = start + i
      if (idx >= 0 && idx < DMX_NUM_CHANNELS) {
        patched[idx] = 1
      }
    }
  }
  for (let i = 0; i < DMX_NUM_CHANNELS; i++) {
    if (!patched[i]) channels[i] = 0
  }
  if (channels.length > DMX_NUM_CHANNELS) {
    channels.length = DMX_NUM_CHANNELS
  }
}

/** Clamp to exactly 512 finite byte values (guards accidental array growth from OOB writes). */
export function normalizeDmxUniverseChannels(channels: number[]): number[] {
  if (channels.length === DMX_NUM_CHANNELS) {
    let ok = true
    for (let i = 0; i < DMX_NUM_CHANNELS; i++) {
      if (!Number.isFinite(channels[i])) {
        ok = false
        break
      }
    }
    if (ok) return channels
  }
  const out = Array(DMX_NUM_CHANNELS).fill(0)
  const n = Math.min(channels.length, DMX_NUM_CHANNELS)
  for (let i = 0; i < n; i++) {
    const v = channels[i]
    out[i] = Number.isFinite(v)
      ? Math.max(DMX_MIN_VALUE, Math.min(DMX_MAX_VALUE, Math.round(v)))
      : 0
  }
  return out
}

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

export type ChannelFxtrTrigger = {
  type: 'fxtrTrigger'
  name: string
  off: DmxValue
  on: DmxValue
}

export type ChannelFxtrLevel = {
  type: 'fxtrLevel'
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
  | ChannelFxtrTrigger
  | ChannelFxtrLevel
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
  'fxtrTrigger',
  'fxtrLevel',
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
  } else if (type === 'fxtrTrigger') {
    return initChannelFxtrTrigger('Trigger')
  } else if (type === 'fxtrLevel') {
    return initChannelFxtrLevel('Level')
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
          ...initChannelFxtrTrigger('On/Off'),
          off: DMX_MIN_VALUE,
          on: 9,
        },
        'On/Off'
      ),
      initSplitChannelRange(
        10,
        DMX_MAX_VALUE,
        {
          ...initChannelFxtrLevel('Level'),
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

export function initChannelFxtrTrigger(name: string): ChannelFxtrTrigger {
  return {
    type: 'fxtrTrigger',
    name,
    off: DMX_MIN_VALUE,
    on: DMX_MAX_VALUE,
  }
}

export function initChannelFxtrLevel(name: string): ChannelFxtrLevel {
  return {
    type: 'fxtrLevel',
    name,
    default: DMX_MIN_VALUE,
    min: DMX_MIN_VALUE,
    max: DMX_MAX_VALUE,
  }
}

/** Rewrites legacy persisted fixture-related strings inside serialized JSON. */
export function migrateLegacyFixturePersistedJson(json: string): string {
  return json
    .replaceAll('"type":"fxTrigger"', '"type":"fxtrTrigger"')
    .replaceAll('"type":"fxLevel"', '"type":"fxtrLevel"')
    .replaceAll('"kind":"atmosphericFx"', '"kind":"atmosphericFxtr"')
}

export function migrateLegacyFixtureChannelDiscriminators(
  channels: FixtureChannel[]
): FixtureChannel[] {
  return JSON.parse(
    migrateLegacyFixturePersistedJson(JSON.stringify(channels))
  ) as FixtureChannel[]
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
  | 'atmosphericFxtr'

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
   * When the fixture type has subfixtures, which subfixture this emitter drives.
   * Channel indexes should be a subset of that subfixture's channels.
   */
  subFixtureIndex?: number
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
  /** Optional editor-only grouping id (WYSIWYG multi-select / move together). */
  groupId?: string
}

export const fixtureModelKinds: FixtureModelKind[] = [
  'auto',
  'parCan',
  'washBar',
  'uplight',
  'moverSpot',
  'moverWash',
  'atmosphericFxtr',
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
  return 'Atmospheric fixture box'
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
  if (kind === 'atmosphericFxtr') {
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
    useCustomEmitterLayout: false,
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
    z: 1,
    size: EMITTER_DEFAULT_DIAMETER_M,
    shape: 'disc',
    channelIndexes,
  }
}

/** Same disc diameter for every emitter; centers may shift slightly for face inset. */
export function fitUniformDiscEmittersToFace(
  sourceEmitters: FixtureEmitterDefinition[],
  targetPositions: { x: number; y: number }[],
  faceWidthM: number,
  faceHeightM: number,
  packingGapRatio: number = 0.1
): FixtureEmitterDefinition[] {
  if (sourceEmitters.length !== targetPositions.length) {
    return sourceEmitters
  }
  let uniformDiameterM = Number.POSITIVE_INFINITY
  for (let index = 0; index < sourceEmitters.length; index++) {
    const target = targetPositions[index]!
    uniformDiameterM = Math.min(
      uniformDiameterM,
      maxDiscDiameterMForFaceSlot(
        clampNormalized(target.x),
        clampNormalized(target.y),
        targetPositions,
        index,
        faceWidthM,
        faceHeightM,
        AUTO_EMITTER_FACE_EDGE_RATIO,
        packingGapRatio
      )
    )
  }
  uniformDiameterM = clampEmitterDiameterM(
    Math.max(EMITTER_DIAMETER_MIN_M, uniformDiameterM)
  )
  return sourceEmitters.map((emitter, index) => {
    const target = targetPositions[index]!
    const centered = clampDiscCenterNormalizedForFaceInset(
      clampNormalized(target.x),
      clampNormalized(target.y),
      uniformDiameterM,
      faceWidthM,
      faceHeightM,
      AUTO_EMITTER_FACE_EDGE_RATIO
    )
    return {
      ...emitter,
      x: centered.x,
      y: centered.y,
      size: uniformDiameterM,
    }
  })
}

/** Concentric PAR rings on the round face (1 + 6 + 12 + … when applicable). Preserves ids/channels/z/shape. */
export function layoutEmittersParRing(
  emitters: FixtureEmitterDefinition[],
  faceWidthM?: number,
  faceHeightM?: number
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const faceD = Math.max(
    0.05,
    faceWidthM ?? faceHeightM ?? PAR_DEFAULT_CYLINDER_DIAMETER_M
  )
  const { positions, diameterM, shellCounts } = solveParConcentricRingLayout(n, faceD)
  const useUniformDiscSize = isParDiamond3Ring9ShellCounts(shellCounts)
  let laid = emitters.map((em, i) => {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y, size: diameterM }
  })
  if (
    faceWidthM !== undefined &&
    faceHeightM !== undefined &&
    Number.isFinite(faceWidthM) &&
    Number.isFinite(faceHeightM)
  ) {
    const targetPositions = laid.map((emitter) => ({
      x: emitter.x,
      y: emitter.y,
    }))
    laid = useUniformDiscSize
      ? fitUniformDiscEmittersToFace(
          laid,
          targetPositions,
          faceWidthM,
          faceHeightM,
          PAR_RING_EMITTER_GAP_RATIO
        )
      : autoResizeEmittersToFitFace(
          laid,
          targetPositions,
          faceWidthM,
          faceHeightM,
          PAR_RING_EMITTER_GAP_RATIO
        )
  }
  return laid
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

/** Inset from the fixture face edge on each side (fraction of face width/height). */
export const EMITTER_AUTO_FACE_EDGE_INSET_RATIO = 0.01
/** Gap between adjacent emitters as a fraction of center-to-center spacing. */
export const EMITTER_AUTO_FACE_PACKING_GAP_RATIO = 0.1

/**
 * Emitter spacing fill for PAR body auto-expand heuristics — matches
 * `1 - EMITTER_AUTO_FACE_PACKING_GAP_RATIO` (max size, 10% gap).
 */
export const PAR_EMITTER_FACE_FILL_RATIO =
  1 - EMITTER_AUTO_FACE_PACKING_GAP_RATIO
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

/** Box front opening width for generic fixtures (PAR, uplight, etc.). */
export const FIXTURE_EMITTER_FACE_WIDTH_SCALE = 0.7

const AUTO_EMITTER_FACE_EDGE_RATIO = EMITTER_AUTO_FACE_EDGE_INSET_RATIO
const AUTO_EMITTER_FACE_PACKING_RATIO = EMITTER_AUTO_FACE_PACKING_GAP_RATIO

/** Wash bars use the full bar width as the emitter face (matches fixture editor “Bar Width”). */
export function fixtureEmitterFaceWidthScale(
  modelKind?: FixtureModelKind | 'auto'
): number {
  if (modelKind === 'washBar') return 1
  return FIXTURE_EMITTER_FACE_WIDTH_SCALE
}

export function fixtureFrontFaceDimensionsM(
  model: Pick<
    FixtureModelConfig,
    'bodyShape' | 'width' | 'bodyHeight' | 'bodyDiameter' | 'kind'
  >
): { faceWidthM: number; faceHeightM: number } {
  if (model.bodyShape === 'cylinder') {
    const d = Math.max(0.05, model.bodyDiameter)
    return { faceWidthM: d, faceHeightM: d }
  }
  const widthScale = fixtureEmitterFaceWidthScale(model.kind)
  return {
    faceWidthM: Math.max(0.05, model.width * widthScale),
    faceHeightM: Math.max(0.05, model.bodyHeight),
  }
}

function emitterEdgeHalfExtentsM(
  x: number,
  y: number,
  faceWidthM: number,
  faceHeightM: number,
  edgeInsetRatio: number
): { halfWidthM: number; halfHeightM: number } {
  const insetX = faceWidthM * edgeInsetRatio
  const insetY = faceHeightM * edgeInsetRatio
  return {
    halfWidthM: Math.max(
      0,
      Math.min(x * faceWidthM - insetX, (1 - x) * faceWidthM - insetX)
    ),
    halfHeightM: Math.max(
      0,
      Math.min(y * faceHeightM - insetY, (1 - y) * faceHeightM - insetY)
    ),
  }
}

/** Center-to-center spacing to the nearest neighbor along each face axis (m). */
function nearestNeighborAxisDistancesM(
  positions: { x: number; y: number }[],
  index: number,
  faceWidthM: number,
  faceHeightM: number
): { xM: number; yM: number } {
  const p = positions[index]
  let bestX = Number.POSITIVE_INFINITY
  let bestY = Number.POSITIVE_INFINITY
  for (let i = 0; i < positions.length; i++) {
    if (i === index) {
      continue
    }
    const q = positions[i]
    const dxM = Math.abs(q.x - p.x) * faceWidthM
    const dyM = Math.abs(q.y - p.y) * faceHeightM
    if (dxM > 1e-9) {
      bestX = Math.min(bestX, dxM)
    }
    if (dyM > 1e-9) {
      bestY = Math.min(bestY, dyM)
    }
  }
  return { xM: bestX, yM: bestY }
}

/** Detect a single row/column layout from normalized emitter positions. */
function detectCollinearLayoutAxis(
  positions: { x: number; y: number }[]
): 'horizontal' | 'vertical' | null {
  if (positions.length < 2) {
    return null
  }
  const ys = positions.map((position) => position.y)
  const xs = positions.map((position) => position.x)
  const ySpan = Math.max(...ys) - Math.min(...ys)
  const xSpan = Math.max(...xs) - Math.min(...xs)
  if (ySpan <= 0.1 && xSpan >= 0.12) {
    return 'horizontal'
  }
  if (xSpan <= 0.1 && ySpan >= 0.12) {
    return 'vertical'
  }
  return null
}

function clampDiscCenterNormalizedForFaceInset(
  x: number,
  y: number,
  diameterM: number,
  faceWidthM: number,
  faceHeightM: number,
  edgeInsetRatio: number
): { x: number; y: number } {
  const radiusNormX = diameterM / 2 / Math.max(faceWidthM, 1e-9)
  const radiusNormY = diameterM / 2 / Math.max(faceHeightM, 1e-9)
  const minX = edgeInsetRatio + radiusNormX
  const maxX = 1 - edgeInsetRatio - radiusNormX
  const minY = edgeInsetRatio + radiusNormY
  const maxY = 1 - edgeInsetRatio - radiusNormY
  return {
    x: clampNormalized(
      minX <= maxX ? Math.min(maxX, Math.max(minX, x)) : 0.5
    ),
    y: clampNormalized(
      minY <= maxY ? Math.min(maxY, Math.max(minY, y)) : 0.5
    ),
  }
}

function nearestNeighborCenterDistanceM(
  positions: { x: number; y: number }[],
  index: number,
  faceWidthM: number,
  faceHeightM: number
): number {
  const p = positions[index]
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < positions.length; i++) {
    if (i === index) {
      continue
    }
    const q = positions[i]
    const d = Math.hypot(
      (q.x - p.x) * faceWidthM,
      (q.y - p.y) * faceHeightM
    )
    if (d > 1e-9) {
      best = Math.min(best, d)
    }
  }
  return best
}

function maxDiscDiameterMForFaceSlot(
  x: number,
  y: number,
  positions: { x: number; y: number }[],
  index: number,
  faceWidthM: number,
  faceHeightM: number,
  edgeInsetRatio: number,
  packingRatio: number
): number {
  const edge = emitterEdgeHalfExtentsM(
    x,
    y,
    faceWidthM,
    faceHeightM,
    edgeInsetRatio
  )
  const neighbor = nearestNeighborAxisDistancesM(
    positions,
    index,
    faceWidthM,
    faceHeightM
  )
  const packScale = Math.max(0, 1 - packingRatio)
  const fromVertical = edge.halfHeightM * 2
  const fromHorizontalEdge = edge.halfWidthM * 2
  const fromNeighborX = Number.isFinite(neighbor.xM)
    ? neighbor.xM * packScale
    : Number.POSITIVE_INFINITY
  const fromNeighborY = Number.isFinite(neighbor.yM)
    ? neighbor.yM * packScale
    : Number.POSITIVE_INFINITY
  const neighborCenter = nearestNeighborCenterDistanceM(
    positions,
    index,
    faceWidthM,
    faceHeightM
  )
  const fromNeighborCenter = Number.isFinite(neighborCenter)
    ? neighborCenter * packScale
    : Number.POSITIVE_INFINITY
  const limits = [
    fromNeighborX,
    fromNeighborY,
    fromNeighborCenter,
    fromVertical,
    fromHorizontalEdge,
  ]
  return Math.min(...limits)
}

function maxRectFaceExtentsMForFaceSlot(
  x: number,
  y: number,
  positions: { x: number; y: number }[],
  index: number,
  faceWidthM: number,
  faceHeightM: number,
  edgeInsetRatio: number,
  packingRatio: number,
  lineAxis: 'horizontal' | 'vertical' | null = null
): { widthM: number; heightM: number } {
  const edge = emitterEdgeHalfExtentsM(
    x,
    y,
    faceWidthM,
    faceHeightM,
    edgeInsetRatio
  )
  const neighbor = nearestNeighborAxisDistancesM(
    positions,
    index,
    faceWidthM,
    faceHeightM
  )
  const packScale = Math.max(0, 1 - packingRatio)
  const neighborWidthCap = Number.isFinite(neighbor.xM)
    ? neighbor.xM * packScale
    : edge.halfWidthM * 2
  const neighborHeightCap = Number.isFinite(neighbor.yM)
    ? neighbor.yM * packScale
    : edge.halfHeightM * 2
  if (lineAxis === 'horizontal') {
    return {
      widthM: neighborWidthCap,
      heightM: edge.halfHeightM * 2,
    }
  }
  if (lineAxis === 'vertical') {
    return {
      widthM: edge.halfWidthM * 2,
      heightM: neighborHeightCap,
    }
  }
  return {
    widthM: Math.min(edge.halfWidthM * 2, neighborWidthCap),
    heightM: Math.min(edge.halfHeightM * 2, neighborHeightCap),
  }
}

/**
 * Resize each emitter to the largest size allowed at its position: at most
 * {@link EMITTER_AUTO_FACE_EDGE_INSET_RATIO} inset from the face edge and
 * {@link EMITTER_AUTO_FACE_PACKING_GAP_RATIO} gap to the nearest neighbor (per axis
 * and center distance for discs).
 */
export function autoResizeEmittersToFitFace(
  sourceEmitters: FixtureEmitterDefinition[],
  targetPositions: { x: number; y: number }[],
  faceWidthM: number,
  faceHeightM: number,
  packingGapRatio: number = AUTO_EMITTER_FACE_PACKING_RATIO
): FixtureEmitterDefinition[] {
  if (sourceEmitters.length !== targetPositions.length) {
    return sourceEmitters
  }
  const lineAxis = detectCollinearLayoutAxis(targetPositions)
  const allDiscs =
    lineAxis === 'horizontal' &&
    sourceEmitters.length > 0 &&
    sourceEmitters.every((emitter) => emitter.shape === 'disc')
  if (allDiscs) {
    let uniformDiameterM = Number.POSITIVE_INFINITY
    for (let index = 0; index < sourceEmitters.length; index++) {
      const target = targetPositions[index]
      uniformDiameterM = Math.min(
        uniformDiameterM,
        maxDiscDiameterMForFaceSlot(
          clampNormalized(target.x),
          clampNormalized(target.y),
          targetPositions,
          index,
          faceWidthM,
          faceHeightM,
          AUTO_EMITTER_FACE_EDGE_RATIO,
          packingGapRatio
        )
      )
    }
    uniformDiameterM = clampEmitterDiameterM(
      Math.max(EMITTER_DIAMETER_MIN_M, uniformDiameterM)
    )
    return sourceEmitters.map((emitter, index) => {
      const target = targetPositions[index]
      let x = clampNormalized(target.x)
      let y = clampNormalized(target.y)
      const centered = clampDiscCenterNormalizedForFaceInset(
        x,
        y,
        uniformDiameterM,
        faceWidthM,
        faceHeightM,
        AUTO_EMITTER_FACE_EDGE_RATIO
      )
      return {
        ...emitter,
        x: centered.x,
        y: centered.y,
        size: uniformDiameterM,
      }
    })
  }
  return sourceEmitters.map((emitter, index) => {
    const target = targetPositions[index]
    let x = clampNormalized(target.x)
    let y = clampNormalized(target.y)
    if (emitter.shape === 'disc') {
      const diameterM = clampEmitterDiameterM(
        Math.max(
          EMITTER_DIAMETER_MIN_M,
          maxDiscDiameterMForFaceSlot(
            x,
            y,
            targetPositions,
            index,
            faceWidthM,
            faceHeightM,
            AUTO_EMITTER_FACE_EDGE_RATIO,
            packingGapRatio
          )
        )
      )
      const centered = clampDiscCenterNormalizedForFaceInset(
        x,
        y,
        diameterM,
        faceWidthM,
        faceHeightM,
        AUTO_EMITTER_FACE_EDGE_RATIO
      )
      x = centered.x
      y = centered.y
      return {
        ...emitter,
        x,
        y,
        size: diameterM,
      }
    }
    const { widthM, heightM } = maxRectFaceExtentsMForFaceSlot(
      x,
      y,
      targetPositions,
      index,
      faceWidthM,
      faceHeightM,
      AUTO_EMITTER_FACE_EDGE_RATIO,
      AUTO_EMITTER_FACE_PACKING_RATIO,
      lineAxis
    )
    const rectWidthM = clampRectFaceExtentM(
      Math.max(EMITTER_DIAMETER_MIN_M, widthM)
    )
    const rectHeightM = clampRectFaceExtentM(
      Math.max(EMITTER_DIAMETER_MIN_M, heightM)
    )
    const sizeRef = clampEmitterDiameterM(Math.max(rectWidthM, rectHeightM))
    if (emitter.shape === 'rect-h') {
      return {
        ...emitter,
        x,
        y,
        size: sizeRef,
        rectWidthM,
        rectHeightM,
      }
    }
    return {
      ...emitter,
      x,
      y,
      size: sizeRef,
      rectWidthM,
      rectHeightM,
    }
  })
}

export type EmitterAutoLayoutKind = 'line' | 'grid' | 'ring' | 'honeycomb'

/**
 * Map each emitter to a layout slot by emitter list index (Emitter 1 = index 0,
 * left→right on a line; grid/ring/honeycomb use the same spatial slot ordering).
 * DMX channel mapping is not used — channels can be reassigned independently.
 */
export function assignEmitterLayoutPositionsInOrder(
  emitters: FixtureEmitterDefinition[],
  candidatePositions: { x: number; y: number }[],
  layout: EmitterAutoLayoutKind
): { x: number; y: number }[] {
  const n = emitters.length
  if (n === 0 || candidatePositions.length !== n) {
    return candidatePositions
  }

  const ordered = [...candidatePositions]
  if (layout === 'line') {
    ordered.sort((left, right) => left.x - right.x || left.y - right.y)
  } else if (layout === 'grid') {
    ordered.sort((left, right) => left.y - right.y || left.x - right.x)
  } else {
    ordered.sort((left, right) => {
      const angleLeft = Math.atan2(left.y - 0.5, left.x - 0.5)
      const angleRight = Math.atan2(right.y - 0.5, right.x - 0.5)
      return angleLeft - angleRight
    })
  }

  return emitters.map(
    (_, emitterIndex) => ordered[emitterIndex] ?? { x: 0.5, y: 0.5 }
  )
}

/** Apply {@link autoResizeEmittersToFitFace} after repositioning emitters on the face. */
export function fitEmitterLayoutToFace(
  emitters: FixtureEmitterDefinition[],
  faceWidthM: number,
  faceHeightM: number
): FixtureEmitterDefinition[] {
  if (emitters.length === 0) {
    return emitters
  }
  const positions = emitters.map((emitter) => ({ x: emitter.x, y: emitter.y }))
  return autoResizeEmittersToFitFace(
    emitters,
    positions,
    faceWidthM,
    faceHeightM
  )
}

/**
 * Largest equal disc diameter and center positions for a single horizontal row:
 * {@link EMITTER_AUTO_FACE_EDGE_INSET_RATIO} face inset, {@link EMITTER_AUTO_FACE_PACKING_GAP_RATIO}
 * gap between neighbors, and full use of face width (wash-bar style).
 */
export function computeUniformHorizontalLineDiscLayout(
  faceWidthM: number,
  faceHeightM: number,
  count: number
): { diameterM: number; positions: { x: number; y: number }[] } {
  if (count <= 0) {
    return { diameterM: EMITTER_DEFAULT_DIAMETER_M, positions: [] }
  }
  const W = Math.max(0.05, faceWidthM)
  const H = Math.max(0.05, faceHeightM)
  const m = AUTO_EMITTER_FACE_EDGE_RATIO
  const pack = AUTO_EMITTER_FACE_PACKING_RATIO
  const usableW = W * (1 - 2 * m)
  const usableH = H * (1 - 2 * m)
  let diameterM =
    count <= 1
      ? Math.min(usableW, usableH)
      : Math.min(
          usableW / ((count - 1) * (1 + pack) + 1),
          usableH
        )
  diameterM = clampEmitterDiameterM(
    Math.max(EMITTER_DIAMETER_MIN_M, diameterM)
  )
  if (count === 1) {
    return { diameterM, positions: [{ x: 0.5, y: 0.5 }] }
  }
  const pitchM = diameterM * (1 + pack)
  const x0M = m * W + diameterM / 2
  const positions = Array.from({ length: count }, (_, i) => ({
    x: clampNormalized((x0M + i * pitchM) / W),
    y: 0.5,
  }))
  return { diameterM, positions }
}

/** Place horizontal-row discs with equal size and even pitch across the face width. */
export function fitUniformHorizontalLineDiscLayoutToFace(
  emitters: FixtureEmitterDefinition[],
  faceWidthM: number,
  faceHeightM: number
): FixtureEmitterDefinition[] {
  if (emitters.length === 0) {
    return emitters
  }
  const { diameterM, positions } = computeUniformHorizontalLineDiscLayout(
    faceWidthM,
    faceHeightM,
    emitters.length
  )
  return emitters.map((emitter, index) => {
    const p = positions[index] ?? { x: 0.5, y: 0.5 }
    return {
      ...emitter,
      x: p.x,
      y: p.y,
      size: diameterM,
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
  return parRingEmitterDiameterM(
    n,
    Math.max(0.05, bodyDiameterM)
  )
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
  return clampEmitterDiameterM(dFromArea * PAR_EMITTER_FACE_FILL_RATIO)
}

export function defaultEmitterDiameterMParBoxLine(
  n: number,
  widthM: number
): number {
  if (n <= 1) {
    return EMITTER_DEFAULT_DIAMETER_M
  }
  const edge = AUTO_EMITTER_FACE_EDGE_RATIO
  const usable = Math.max(
    0.01,
    widthM * PAR_EMITTER_VISUAL_FACE_SCALE * (1 - 2 * edge)
  )
  const spacing = usable / Math.max(1, n - 1)
  return clampEmitterDiameterM(spacing * (1 - AUTO_EMITTER_FACE_PACKING_RATIO))
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
  const edge = AUTO_EMITTER_FACE_EDGE_RATIO
  const usableW = Math.max(
    0.01,
    widthM * PAR_EMITTER_VISUAL_FACE_SCALE * (1 - 2 * edge)
  )
  const usableH = Math.max(
    0.01,
    heightM * PAR_EMITTER_VISUAL_FACE_SCALE * (1 - 2 * edge)
  )
  const sx = cols <= 1 ? usableW : usableW / (cols - 1)
  const sy = rows <= 1 ? usableH : usableH / (rows - 1)
  return clampEmitterDiameterM(
    Math.min(sx, sy) * (1 - AUTO_EMITTER_FACE_PACKING_RATIO)
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

/** Tight packing gap for PAR concentric ring layouts (~2.5% between emitter edges). */
export const PAR_RING_EMITTER_GAP_RATIO = 0.025

const PAR_RING_EDGE_INSET_RATIO = 0.012
const PAR_RING_HEX_STAGGER = Math.sqrt(3) / 2

export type ParConcentricRingLayout = {
  positions: { x: number; y: number }[]
  diameterM: number
  shellCounts: number[]
}

/**
 * Greedy decomposition into shells of 6, 12, 18, … (6×k), allowing a final
 * partial shell of 3–5 only when no better packing exists.
 */
function decomposeIntoShells(ledCount: number): number[] | null {
  if (ledCount <= 0) {
    return null
  }
  if (ledCount <= 6) {
    return [ledCount]
  }

  const shells: number[] = []
  let remaining = ledCount
  let shellIndex = 1
  while (remaining > 0) {
    const fullShell = 6 * shellIndex
    if (remaining < fullShell) {
      if (remaining >= 3) {
        shells.push(remaining)
        return shells
      }
      return null
    }
    shells.push(fullShell)
    remaining -= fullShell
    shellIndex += 1
  }
  return shells
}

function scoreParRingShellCounts(shellCounts: number[]): number {
  if (shellCounts.length === 0) {
    return Number.NEGATIVE_INFINITY
  }
  if (shellCounts.length === 1 && shellCounts[0] === 1) {
    return 1000
  }
  if (shellCounts.length === 2 && shellCounts[0] === 3 && shellCounts[1] === 9) {
    return 1000
  }

  const hasCenter = shellCounts[0] === 1 && shellCounts.length > 1
  const rings = hasCenter ? shellCounts.slice(1) : shellCounts
  let score = 0

  if (rings.length === 1) {
    score += 35
  } else if (rings.every((count) => count % 6 === 0 && count >= 6)) {
    score += 45
  }

  if (hasCenter && rings.every((count) => count % 6 === 0 && count >= 6)) {
    score += 30
  }

  for (let i = 0; i < rings.length; i++) {
    const count = rings[i]!
    const isOuter = i === rings.length - 1
    if (count % 6 === 0 && count >= 6) {
      score += 40
    } else if (count >= 3) {
      score += 8
    }
    if (isOuter && count % 6 !== 0 && count > 1) {
      score -= 120
    } else if (!isOuter && count % 6 !== 0 && count > 1) {
      score -= 40
    }
  }

  return score
}

/**
 * Shell sizes inside→out for PAR ring layout: optional center (1) plus rings of
 * 6, 12, 18, … LEDs (6×k), or 3+9 (diamond center + outer ring for 12). Picks the most symmetric packing.
 */
function parRingShellCounts(n: number): number[] {
  if (n <= 0) {
    return []
  }
  if (n === 1) {
    return [1]
  }
  if (n <= 6) {
    return [n]
  }

  const candidates: number[][] = [[n]]

  if (n === 12) {
    candidates.push([3, 9])
  }

  const withoutCenter = decomposeIntoShells(n)
  if (withoutCenter !== null) {
    candidates.push(withoutCenter)
  }

  const inner = decomposeIntoShells(n - 1)
  if (inner !== null) {
    candidates.push([1, ...inner])
  }

  let best = candidates[0]!
  let bestScore = scoreParRingShellCounts(best)
  for (let i = 1; i < candidates.length; i++) {
    const cand = candidates[i]!
    const s = scoreParRingShellCounts(cand)
    if (s > bestScore) {
      bestScore = s
      best = cand
    }
  }
  return best
}

function parRingPositionsOnCircle(
  count: number,
  radius: number,
  cx: number,
  cy: number,
  startAngle: number
): { x: number; y: number }[] {
  if (count <= 0) {
    return []
  }
  if (count === 1) {
    return [{ x: clampNormalized(cx), y: clampNormalized(cy) }]
  }
  return Array.from({ length: count }, (_, i) => {
    const t = startAngle + (2 * Math.PI * i) / count
    return {
      x: clampNormalized(cx + radius * Math.cos(t)),
      y: clampNormalized(cy + radius * Math.sin(t)),
    }
  })
}

function buildParRingRadiiNorm(
  ringCounts: number[],
  hasCenter: boolean,
  dNorm: number,
  fill: number,
  maxCenterR: number
): number[] | null {
  if (ringCounts.length === 0) {
    return null
  }
  const radii: number[] = []
  const hexStep = dNorm * PAR_RING_HEX_STAGGER * fill

  for (let i = 0; i < ringCounts.length; i++) {
    const count = ringCounts[i]!
    let r: number

    if (hasCenter && i === 0) {
      r = dNorm * fill
    } else if (!hasCenter && ringCounts.length === 1) {
      r = maxCenterR
    } else if (i === 0) {
      r = dNorm * fill
    } else {
      r = radii[i - 1]! + hexStep
    }

    if (count > 1) {
      const tangentialMin = (dNorm * fill) / (2 * Math.sin(Math.PI / count))
      r = Math.max(r, tangentialMin)
      const chord = 2 * r * Math.sin(Math.PI / count)
      if (chord + 1e-9 < dNorm * fill) {
        return null
      }
    }

    if (r > maxCenterR + 1e-9) {
      return null
    }
    radii.push(r)
  }

  const outer = radii[radii.length - 1]!
  if (ringCounts.length > 1 && outer > 0 && outer < maxCenterR * 0.985) {
    const scale = maxCenterR / outer
    for (let i = 0; i < radii.length; i++) {
      radii[i] = radii[i]! * scale
      const count = ringCounts[i]!
      if (count > 1) {
        const chord = 2 * radii[i]! * Math.sin(Math.PI / count)
        if (chord + 1e-9 < dNorm * fill) {
          return null
        }
      }
      if (radii[i]! > maxCenterR + 1e-9) {
        return null
      }
    }
  }

  return radii
}

function assembleParRingPositions(
  hasCenter: boolean,
  ringCounts: number[],
  radii: number[]
): { x: number; y: number }[] {
  const cx = 0.5
  const cy = 0.5
  const positions: { x: number; y: number }[] = []
  if (hasCenter) {
    positions.push({ x: cx, y: cy })
  }
  for (let ringIndex = 0; ringIndex < ringCounts.length; ringIndex++) {
    const count = ringCounts[ringIndex]!
    const r = radii[ringIndex]!
    const stagger = ringIndex % 2 === 1 && count > 1 ? Math.PI / count : 0
    positions.push(
      ...parRingPositionsOnCircle(
        count,
        r,
        cx,
        cy,
        -Math.PI / 2 + stagger
      )
    )
  }
  return positions
}

function tryBuildParRingAtDiameterNorm(
  hasCenter: boolean,
  ringCounts: number[],
  dNorm: number,
  fill: number
): { positions: { x: number; y: number }[] } | null {
  const half = dNorm / 2
  const maxCenterR = 0.5 - PAR_RING_EDGE_INSET_RATIO - half
  if (maxCenterR <= 0) {
    return null
  }
  const radii = buildParRingRadiiNorm(
    ringCounts,
    hasCenter,
    dNorm,
    fill,
    maxCenterR
  )
  if (radii === null) {
    return null
  }
  return {
    positions: assembleParRingPositions(hasCenter, ringCounts, radii),
  }
}

function isParDiamond3Ring9ShellCounts(shellCounts: number[]): boolean {
  return (
    shellCounts.length === 2 && shellCounts[0] === 3 && shellCounts[1] === 9
  )
}

/** 3 LEDs in an equilateral triangle (diamond) + 9 on an outer ring — common 12-LED PAR. */
function tryBuildParDiamond3Ring9AtDiameterNorm(
  dNorm: number,
  fill: number
): { positions: { x: number; y: number }[] } | null {
  const half = dNorm / 2
  const maxOuterR = 0.5 - PAR_RING_EDGE_INSET_RATIO - half
  if (maxOuterR <= 0) {
    return null
  }

  const cx = 0.5
  const cy = 0.5
  const centerDist = dNorm * fill
  const rInner = centerDist / Math.sqrt(3)

  const inner: { x: number; y: number }[] = []
  for (let i = 0; i < 3; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / 3
    inner.push({
      x: clampNormalized(cx + rInner * Math.cos(t)),
      y: clampNormalized(cy + rInner * Math.sin(t)),
    })
  }

  let rOuter = rInner + centerDist
  const tangentialMin = (dNorm * fill) / (2 * Math.sin(Math.PI / 9))
  rOuter = Math.max(rOuter, tangentialMin)
  if (rOuter > maxOuterR + 1e-9) {
    return null
  }

  const outer = parRingPositionsOnCircle(9, rOuter, cx, cy, -Math.PI / 2)
  return { positions: [...inner, ...outer] }
}

function solveParDiamond3Ring9Layout(
  faceDiameterM: number,
  shellCounts: number[]
): ParConcentricRingLayout {
  const fill = 1 - PAR_RING_EMITTER_GAP_RATIO
  const faceD = Math.max(0.05, faceDiameterM)
  let dLo = EMITTER_DIAMETER_MIN_M / faceD
  let dHi = 0.48
  let bestPositions: { x: number; y: number }[] = []
  let bestDNorm = dLo

  for (let iter = 0; iter < 64; iter++) {
    const dNorm = (dLo + dHi) / 2
    const built = tryBuildParDiamond3Ring9AtDiameterNorm(dNorm, fill)
    if (built !== null) {
      dLo = dNorm
      bestPositions = built.positions
      bestDNorm = dNorm
    } else {
      dHi = dNorm
    }
  }

  if (bestPositions.length === 0) {
    bestPositions = tryBuildParDiamond3Ring9AtDiameterNorm(dLo, fill)?.positions ?? []
    bestDNorm = dLo
  }

  return {
    positions: bestPositions,
    diameterM: clampEmitterDiameterM(bestDNorm * faceD),
    shellCounts,
  }
}

/** Solve concentric ring centers and a uniform disc diameter that fills the round face. */
export function solveParConcentricRingLayout(
  n: number,
  faceDiameterM: number
): ParConcentricRingLayout {
  const shellCounts = parRingShellCounts(n)
  const hasCenter = shellCounts[0] === 1 && shellCounts.length > 1
  const ringCounts = hasCenter ? shellCounts.slice(1) : shellCounts
  const fill = 1 - PAR_RING_EMITTER_GAP_RATIO
  const faceD = Math.max(0.05, faceDiameterM)

  if (n <= 0) {
    return {
      positions: [],
      diameterM: EMITTER_DEFAULT_DIAMETER_M,
      shellCounts,
    }
  }

  if (n === 1) {
    const dNorm = Math.min(
      0.38,
      (0.5 - PAR_RING_EDGE_INSET_RATIO * 2) * fill
    )
    return {
      positions: [{ x: 0.5, y: 0.5 }],
      diameterM: clampEmitterDiameterM(dNorm * faceD),
      shellCounts,
    }
  }

  if (isParDiamond3Ring9ShellCounts(shellCounts)) {
    return solveParDiamond3Ring9Layout(faceD, shellCounts)
  }

  let dLo = EMITTER_DIAMETER_MIN_M / faceD
  let dHi = 0.48
  let bestPositions: { x: number; y: number }[] = []
  let bestDNorm = dLo

  for (let iter = 0; iter < 64; iter++) {
    const dNorm = (dLo + dHi) / 2
    const built = tryBuildParRingAtDiameterNorm(
      hasCenter,
      ringCounts,
      dNorm,
      fill
    )
    if (built !== null) {
      dLo = dNorm
      bestPositions = built.positions
      bestDNorm = dNorm
    } else {
      dHi = dNorm
    }
  }

  if (bestPositions.length === 0) {
    bestPositions = parRingPositionsOnCircle(
      n,
      0.5 - PAR_RING_EDGE_INSET_RATIO - dLo / 2,
      0.5,
      0.5,
      -Math.PI / 2
    )
    bestDNorm = dLo
  }

  return {
    positions: bestPositions.slice(0, n),
    diameterM: clampEmitterDiameterM(bestDNorm * faceD),
    shellCounts,
  }
}

/**
 * Normalized (0–1) PAR ring positions: concentric rings packed to the face with
 * staggered shells. First LED at 12 o'clock, clockwise within each ring.
 */
export function normalizedParRingEmitterPositions(
  n: number,
  faceDiameterM: number = PAR_DEFAULT_CYLINDER_DIAMETER_M
): { x: number; y: number }[] {
  return solveParConcentricRingLayout(n, faceDiameterM).positions
}

export function parRingEmitterDiameterM(
  n: number,
  faceDiameterM: number = PAR_DEFAULT_CYLINDER_DIAMETER_M
): number {
  return solveParConcentricRingLayout(n, faceDiameterM).diameterM
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
  n: number,
  faceWidthM?: number,
  faceHeightM?: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return []
  }
  if (
    faceWidthM !== undefined &&
    faceHeightM !== undefined &&
    Number.isFinite(faceWidthM) &&
    Number.isFinite(faceHeightM)
  ) {
    return computeUniformHorizontalLineDiscLayout(
      faceWidthM,
      faceHeightM,
      n
    ).positions
  }
  const m = AUTO_EMITTER_FACE_EDGE_RATIO
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
  const m = AUTO_EMITTER_FACE_EDGE_RATIO
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
  const { positions, diameterM } = solveParConcentricRingLayout(
    n,
    Math.max(0.05, bodyDiameterM)
  )
  return positions.map((p, i) =>
    makeParEmitter(p.x, p.y, PAR_EMITTER_Z, i, maxChannelIndex, diameterM)
  )
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

/** Honeycomb on the round front face; preserves ids/channels/z/shape. */
export function layoutEmittersParHoneycomb(
  emitters: FixtureEmitterDefinition[],
  faceWidthM?: number,
  faceHeightM?: number
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const chosen = normalizedParHoneycombEmitterPositions(n)
  const laid = emitters.map((em, i) => {
    const p = chosen[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
  if (
    faceWidthM !== undefined &&
    faceHeightM !== undefined &&
    Number.isFinite(faceWidthM) &&
    Number.isFinite(faceHeightM)
  ) {
    return fitEmitterLayoutToFace(laid, faceWidthM, faceHeightM)
  }
  return laid
}

/** Single row on the rectangular face; preserves emitter metadata. */
export function layoutEmittersParBoxLine(
  emitters: FixtureEmitterDefinition[],
  faceWidthM?: number,
  faceHeightM?: number
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const positions = normalizedParBoxLineEmitterPositions(n, faceWidthM, faceHeightM)
  const laid = emitters.map((em, i) => {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
  if (
    faceWidthM !== undefined &&
    faceHeightM !== undefined &&
    Number.isFinite(faceWidthM) &&
    Number.isFinite(faceHeightM)
  ) {
    const allDiscs = laid.every((emitter) => emitter.shape === 'disc')
    if (allDiscs) {
      return fitUniformHorizontalLineDiscLayoutToFace(
        laid,
        faceWidthM,
        faceHeightM
      )
    }
    return fitEmitterLayoutToFace(laid, faceWidthM, faceHeightM)
  }
  return laid
}

/** Rows and columns on the rectangular face; preserves emitter metadata. */
export function layoutEmittersParBoxGrid(
  emitters: FixtureEmitterDefinition[],
  faceWidthM?: number,
  faceHeightM?: number
): FixtureEmitterDefinition[] {
  const n = emitters.length
  if (n === 0) return emitters
  const positions = normalizedParBoxGridEmitterPositions(n)
  const laid = emitters.map((em, i) => {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    return { ...em, x: p.x, y: p.y }
  })
  if (
    faceWidthM !== undefined &&
    faceHeightM !== undefined &&
    Number.isFinite(faceWidthM) &&
    Number.isFinite(faceHeightM)
  ) {
    return fitEmitterLayoutToFace(laid, faceWidthM, faceHeightM)
  }
  return laid
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
    const shells = parRingShellCounts(n)
    const outerCount = shells[shells.length - 1] ?? n
    const circumference = outerCount * EMITTER_CENTER_GAP_M
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
  if (kind === 'atmosphericFxtr') return 0.22
  if (kind === 'moverSpot' || kind === 'moverWash') return 0.18
  return 0.3
}

function defaultBodyDepthForKind(kind: FixtureModelKind): number {
  if (kind === 'parCan') return PAR_DEFAULT_CYLINDER_DEPTH_M
  if (kind === 'washBar') return 0.061
  if (kind === 'uplight') return 0.3
  if (kind === 'atmosphericFxtr') return 0.32
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

/**
 * Every emitter in a subfixture's slot gets the full channel list for that sub
 * (spatial modulation uses the group; splitting channels across emitters was confusing).
 */
export function bundleSubfixtureChannelsOntoEmitters(
  fixtureType: FixtureType,
  emittersPerSubFixture: number,
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const subs = fixtureType.subFixtures
  if (subs.length === 0) {
    return emitters
  }
  const maxChannelIndex = fixtureType.channels.length - 1
  if (maxChannelIndex < 0) {
    return emitters
  }
  const ePer = Math.max(1, Math.round(emittersPerSubFixture))
  const expectedCount = subs.length * ePer
  return emitters.map((em, i) => {
    let subIdx: number
    if (emitters.length === expectedCount) {
      subIdx = Math.floor(i / ePer)
    } else if (ePer === 1 && emitters.length === subs.length) {
      subIdx = i
    } else {
      subIdx = Math.min(Math.floor(i / ePer), subs.length - 1)
    }
    const sub = subs[subIdx]
    if (sub === undefined || sub.channels.length === 0) {
      return em
    }
    const bundle = sanitizeEmitterChannels(sub.channels, maxChannelIndex)
    if (bundle.length === 0) {
      return em
    }
    return { ...em, channelIndexes: bundle, subFixtureIndex: subIdx }
  })
}

/**
 * Multi-strip wash bars lay out emitters as [RGB top row][RGB bottom row][WW][CW].
 * Generic index-based bundling maps bottom-row pixel i to sub i+rgbCount instead of
 * sub i, so every subfixture shares the wrong channel set and spatial anchor.
 */
export function bundleMultiStripWashBarSubfixtureChannels(
  fixtureType: FixtureType,
  rgbCount: number,
  warmWhiteCount: number,
  coolWhiteCount: number,
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const subs = fixtureType.subFixtures
  if (subs.length === 0 || emitters.length === 0) {
    return emitters
  }

  const maxChannelIndex = fixtureType.channels.length - 1
  if (maxChannelIndex < 0) {
    return emitters
  }

  const rgbN = Math.max(1, Math.min(64, Math.round(rgbCount)))
  const wwN = Math.max(1, Math.min(64, Math.round(warmWhiteCount)))
  const cwN = Math.max(1, Math.min(64, Math.round(coolWhiteCount)))
  const rgbTopEnd = rgbN
  const rgbBottomEnd = rgbN * 2
  const wwEnd = rgbBottomEnd + wwN
  const cwStart = wwEnd

  const applySubBundle = (
    emitter: FixtureEmitterDefinition,
    subIndex: number
  ): FixtureEmitterDefinition => {
    const sub = subs[Math.min(Math.max(0, subIndex), subs.length - 1)]
    if (sub === undefined || sub.channels.length === 0) {
      return emitter
    }
    const bundle = sanitizeEmitterChannels(sub.channels, maxChannelIndex)
    if (bundle.length === 0) {
      return emitter
    }
    return { ...emitter, channelIndexes: bundle, subFixtureIndex: subIndex }
  }

  return emitters.map((emitter, index) => {
    if (index < rgbTopEnd) {
      return applySubBundle(emitter, index)
    }
    if (index < rgbBottomEnd) {
      return applySubBundle(emitter, index - rgbN)
    }
    if (index < wwEnd) {
      const wwSubIndex = rgbN + (index - rgbBottomEnd)
      return applySubBundle(emitter, wwSubIndex)
    }
    const cwSubIndex = rgbN + wwN + Math.min(index - cwStart, cwN - 1)
    return applySubBundle(emitter, cwSubIndex)
  })
}

export function bundleSubfixtureChannelsForFixtureModel(
  fixtureType: FixtureType,
  model: FixtureModelConfig,
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  const normalizedKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  if (
    normalizedKind === 'washBar' &&
    model.washBarLayoutMode === 'multiStrip' &&
    fixtureType.subFixtures.length > 0
  ) {
    return bundleMultiStripWashBarSubfixtureChannels(
      fixtureType,
      model.washBarRgbCount,
      model.washBarWarmWhiteCount,
      model.washBarCoolWhiteCount,
      emitters
    )
  }
  return bundleSubfixtureChannelsOntoEmitters(
    fixtureType,
    model.emittersPerSubFixture,
    emitters
  )
}

/** Re-apply subfixture channel bundles to custom emitters (e.g. after subfixture edits). */
export function syncCustomEmitterSubfixtureChannels(
  fixtureType: FixtureType
): FixtureModelConfig | undefined {
  const model = fixtureType.model
  if (model === undefined) {
    return undefined
  }
  if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) {
    return model
  }
  if (fixtureType.subFixtures.length === 0) {
    return model
  }
  return {
    ...model,
    customEmitters: bundleSubfixtureChannelsForFixtureModel(
      fixtureType,
      model,
      model.customEmitters
    ),
  }
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
  },
  bodyShape: FixtureBodyShape = 'box'
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
    channels: number | number[],
    rectFace?: { widthM: number; heightM: number }
  ) => {
    const rawList =
      typeof channels === 'number' ? [channels] : channels
    const sanitized =
      maxChannelIndex >= 0
        ? sanitizeEmitterChannels(rawList, maxChannelIndex)
        : []
    const safeSingle =
      maxChannelIndex >= 0
        ? Math.max(
            0,
            Math.min(
              maxChannelIndex,
              typeof channels === 'number'
                ? channels
                : sanitized[0] ?? rawList[0] ?? 0
            )
          )
        : 0
    const channelIndexes =
      maxChannelIndex < 0
        ? []
        : sanitized.length > 0
          ? sanitized
          : [safeSingle]
    const row: FixtureEmitterDefinition = {
      id: nanoid(),
      x: clampNormalized(x),
      y: clampNormalized(y),
      z: clampNormalized(z),
      shape,
      size: normalizeEmitterDiameterM(size),
      channelIndexes,
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
      pushEmitter(t, 0.16, 1, 'rect-h', 0.8, i, rgbFace)
      pushEmitter(t, 0.84, 1, 'rect-h', 0.8, i, rgbFace)
    }
    for (let i = 0; i < washBarWarmWhiteCount; i++) {
      const t = washBarWarmWhiteCount <= 1 ? 0.5 : i / (washBarWarmWhiteCount - 1)
      pushEmitter(t, 0.5, 1, 'disc', 1.1, i)
    }
    for (let i = 0; i < washBarCoolWhiteCount; i++) {
      const t = washBarCoolWhiteCount <= 1 ? 0.5 : i / (washBarCoolWhiteCount - 1)
      pushEmitter(t, 0.5, 1, 'rect-v', 0.85, i, cwFace)
    }
    return bundleMultiStripWashBarSubfixtureChannels(
      fixtureType,
      washBarRgbCount,
      washBarWarmWhiteCount,
      washBarCoolWhiteCount,
      emitters
    )
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

  if (normalizedKind === 'washBar' && washBarLayoutMode === 'linear') {
    const zFace = 1
    const positions = normalizedParBoxLineEmitterPositions(count)
    for (let i = 0; i < count; i++) {
      const p = positions[i] ?? { x: 0.5, y: 0.5 }
      pushEmitter(p.x, p.y, zFace, 'disc', EMITTER_DEFAULT_DIAMETER_M, i)
    }
    return bundleSubfixtureChannelsOntoEmitters(
      fixtureType,
      emittersPerSubFixture,
      emitters
    )
  }

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
      const built =
        parCylinderLayout === 'ring'
          ? buildParCylinderRing(count, maxChannelIndex, bodyDiameterM)
          : buildParCylinderHoneycomb(count, maxChannelIndex, bodyDiameterM)
      return bundleSubfixtureChannelsOntoEmitters(
        fixtureType,
        emittersPerSubFixture,
        built
      )
    }
    const built =
      parRectLayout === 'line'
        ? buildParBoxLine(count, maxChannelIndex, boxWidthM)
        : buildParBoxGrid(count, maxChannelIndex, boxWidthM, boxHeightM)
    return bundleSubfixtureChannelsOntoEmitters(
      fixtureType,
      emittersPerSubFixture,
      built
    )
  }

  const zFace = 1
  const positions =
    bodyShape === 'cylinder' && normalizedKind !== 'parCan'
      ? count <= 1
        ? [{ x: 0.5, y: 0.5 }]
        : normalizedParHoneycombEmitterPositions(count)
      : normalizedParBoxGridEmitterPositions(count)
  for (let i = 0; i < count; i++) {
    const p = positions[i] ?? { x: 0.5, y: 0.5 }
    pushEmitter(p.x, p.y, zFace, 'disc', EMITTER_DEFAULT_DIAMETER_M, i)
  }
  return bundleSubfixtureChannelsOntoEmitters(
    fixtureType,
    emittersPerSubFixture,
    emitters
  )
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
    parContext,
    model.bodyShape
  )
  const dims = fixtureFrontFaceDimensionsM(model)
  const positions = raw.map((e) => ({ x: e.x, y: e.y }))
  const lineAxis = detectCollinearLayoutAxis(positions)
  const allDiscs =
    raw.length > 0 && raw.every((emitter) => emitter.shape === 'disc')
  if (lineAxis === 'horizontal' && allDiscs) {
    return fitUniformHorizontalLineDiscLayoutToFace(
      raw,
      dims.faceWidthM,
      dims.faceHeightM
    )
  }
  const fitted = autoResizeEmittersToFitFace(
    raw,
    positions,
    dims.faceWidthM,
    dims.faceHeightM
  )
  if (fixtureType.subFixtures.length === 0) {
    return fitted
  }
  return bundleSubfixtureChannelsForFixtureModel(fixtureType, model, fitted)
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

/** One-line summary for the fixture list (3D model is optional for DMX control). */
export function fixtureModelSummaryLine(fixtureType: FixtureType): string {
  const model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)
  const kind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const subCount = Math.max(1, fixtureType.subFixtures.length)
  const emitterCount = resolvedEmittersForFixtureType(fixtureType).length
  const customLayout = model.useCustomEmitterLayout ? ' · custom layout' : ''
  return `${fixtureModelKindName(kind)} · ${subCount} segment${
    subCount === 1 ? '' : 's'
  } · ${emitterCount} emitter${emitterCount === 1 ? '' : 's'}${customLayout}`
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
export function universeHasMovers(
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
  const hasAtmosFxtrChannels = fixtureType.channels.flatMap((channel) =>
    fixtureChannelLeafChannels(channel)
  ).some(
    (channel) => channel.type === 'fxtrTrigger' || channel.type === 'fxtrLevel'
  )
  if (hasAtmosFxtrChannels) {
    return 'atmosphericFxtr'
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

export type NormalizeFixtureModelOptions = {
  /**
   * WYSIWYG editor updates: keep saved emitter positions, sizes, shapes, and
   * per-emitter channel picks (do not re-bundle from subfixtures or auto-layout).
   */
  preserveCustomEmitterLayout?: boolean
}

export function normalizeFixtureModelConfig(
  config: unknown,
  fixtureType: FixtureType,
  options?: NormalizeFixtureModelOptions
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

  const rawKind =
    typeof source.kind === 'string' ? source.kind.trim() : ''
  const migratedKind =
    rawKind === 'atmosphericFx' ? 'atmosphericFxtr' : rawKind
  const kind =
    migratedKind.length > 0 &&
    fixtureModelKinds.includes(migratedKind as FixtureModelKind)
      ? (migratedKind as FixtureModelKind)
      : defaults.kind

  const normalizedKind = kind === 'auto' ? inferFixtureModelKind(fixtureType) : kind

  const defaultEmitters =
    normalizedKind === 'washBar'
      ? 4
      : normalizedKind === 'moverWash'
      ? 7
      : normalizedKind === 'atmosphericFxtr'
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
      : normalizedKind === 'atmosphericFxtr'
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
        subFixtureIndex?: unknown
        groupId?: unknown
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
      const subRaw = Number(emitter.subFixtureIndex)
      if (
        fixtureType.subFixtures.length > 0 &&
        Number.isFinite(subRaw) &&
        subRaw >= 0 &&
        subRaw < fixtureType.subFixtures.length
      ) {
        row.subFixtureIndex = Math.floor(subRaw)
      }
      if (typeof emitter.groupId === 'string' && emitter.groupId.trim().length > 0) {
        row.groupId = emitter.groupId.trim()
      }
      if (hasBothRectDims) {
        row.rectWidthM = clampRectFaceExtentM(rw)
        row.rectHeightM = clampRectFaceExtentM(rh)
      }
      return row
    })
    .filter((value): value is FixtureEmitterDefinition => value !== null)

  const explicitCustom =
    source.useCustomEmitterLayout === true
      ? true
      : source.useCustomEmitterLayout === false
        ? false
        : null
  const useCustomEmitterLayout =
    explicitCustom !== null
      ? explicitCustom
      : normalizedCustomEmitters.length > 0

  const hasSavedCustomLayout =
    useCustomEmitterLayout && normalizedCustomEmitters.length > 0

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

  const emitterCountForPar = hasSavedCustomLayout
    ? Math.max(1, normalizedCustomEmitters.length)
    : defaultEmitterCountForFixture(
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
      : undefined,
    bodyShape
  )
  const faceDimsForDefaults = fixtureFrontFaceDimensionsM({
    kind: normalizedKind,
    bodyShape,
    width: widthM,
    bodyHeight: bodyHeightM,
    bodyDiameter: bodyDiameterM,
  })
  const defaultPositions = defaultCustomEmittersRaw.map((e) => ({
    x: e.x,
    y: e.y,
  }))
  const defaultLineAxis = detectCollinearLayoutAxis(defaultPositions)
  const defaultAllDiscs =
    defaultCustomEmittersRaw.length > 0 &&
    defaultCustomEmittersRaw.every((emitter) => emitter.shape === 'disc')
  let defaultCustomEmitters =
    defaultLineAxis === 'horizontal' && defaultAllDiscs
      ? fitUniformHorizontalLineDiscLayoutToFace(
          defaultCustomEmittersRaw,
          faceDimsForDefaults.faceWidthM,
          faceDimsForDefaults.faceHeightM
        )
      : autoResizeEmittersToFitFace(
          defaultCustomEmittersRaw,
          defaultPositions,
          faceDimsForDefaults.faceWidthM,
          faceDimsForDefaults.faceHeightM
        )
  if (fixtureType.subFixtures.length > 0 && defaultCustomEmitters.length > 0) {
    defaultCustomEmitters = bundleSubfixtureChannelsForFixtureModel(
      fixtureType,
      {
        kind: normalizedKind,
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
        useCustomEmitterLayout: false,
        customEmitters: defaultCustomEmitters,
        emitterFaceAutoSize,
        parRectLayout,
        parCylinderLayout,
      },
      defaultCustomEmitters
    )
  }
  const emittersPerSubFixture = fixedEmitterCount ?? requestedEmitters
  const preserveCustomLayout =
    options?.preserveCustomEmitterLayout === true || hasSavedCustomLayout

  let customEmitters = preserveCustomLayout
    ? normalizedCustomEmitters
    : normalizedCustomEmitters.length > 0
      ? normalizedCustomEmitters
      : defaultCustomEmitters

  if (
    !preserveCustomLayout &&
    fixtureType.subFixtures.length > 0 &&
    customEmitters.length > 0
  ) {
    customEmitters = bundleSubfixtureChannelsForFixtureModel(
      fixtureType,
      {
        kind: normalizedKind,
        emittersPerSubFixture,
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
      },
      customEmitters
    )
  }

  if (
    useCustomEmitterLayout &&
    customEmitters.length === 0 &&
    defaultCustomEmitters.length > 0
  ) {
    customEmitters = defaultCustomEmitters
  }

  return {
    kind,
    emittersPerSubFixture,
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

export function computeEmitterCentroid(
  emitters: FixtureEmitterDefinition[]
): { x: number; y: number; z: number } | null {
  if (emitters.length === 0) return null
  let sx = 0
  let sy = 0
  let sz = 0
  for (const e of emitters) {
    sx += clampNormalized(e.x)
    sy += clampNormalized(e.y)
    sz += clampNormalized(e.z)
  }
  const n = emitters.length
  return { x: sx / n, y: sy / n, z: sz / n }
}

/** Infer subfixture from channel overlap (legacy emitters without `subFixtureIndex`). */
export function inferEmitterSubFixtureIndex(
  fixtureType: FixtureType,
  emitter: FixtureEmitterDefinition
): number | null {
  const subs = fixtureType.subFixtures
  if (subs.length === 0) {
    return null
  }
  if (emitter.channelIndexes.length === 0) {
    return null
  }
  const channelSet = new Set(emitter.channelIndexes)
  let bestIdx: number | null = null
  let bestOverlap = 0
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i]
    if (sub === undefined) {
      continue
    }
    let overlap = 0
    for (const ch of sub.channels) {
      if (channelSet.has(ch)) {
        overlap++
      }
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestIdx = i
    }
  }
  return bestOverlap > 0 ? bestIdx : null
}

export function resolveEmitterSubFixtureIndex(
  fixtureType: FixtureType,
  emitter: FixtureEmitterDefinition
): number | null {
  const subs = fixtureType.subFixtures
  if (subs.length === 0) {
    return null
  }
  const raw = emitter.subFixtureIndex
  if (raw !== undefined && Number.isFinite(raw)) {
    const idx = Math.floor(raw)
    if (idx >= 0 && idx < subs.length) {
      return idx
    }
  }
  return inferEmitterSubFixtureIndex(fixtureType, emitter)
}

export function emittersForSubfixtureIndex(
  fixtureType: FixtureType,
  allEmitters: FixtureEmitterDefinition[],
  subIndex: number
): FixtureEmitterDefinition[] {
  const subs = fixtureType.subFixtures
  if (subs.length === 0) {
    return allEmitters
  }
  const sub = subs[subIndex]
  if (sub === undefined || sub.channels.length === 0) {
    return []
  }
  const channelSet = new Set(sub.channels)
  return allEmitters.filter((em) => {
    const resolved = resolveEmitterSubFixtureIndex(fixtureType, em)
    if (resolved !== null) {
      return resolved === subIndex
    }
    return em.channelIndexes.some((ch) => channelSet.has(ch))
  })
}

export function resolvedFixtureSubWindowInParent(
  fixtureWindow: Window2D_t,
  sub: { relative_window?: Window2D_t }
): Window2D_t {
  return sub.relative_window
    ? window2DToParentCoords(sub.relative_window, fixtureWindow)
    : fixtureWindow
}

/** Matches fixture-mapping pad outline when stored motion-window width is still zero. */
export const FIXTURE_MOTION_PAD_MIN_AXIS_SPAN = 0.05

/**
 * Effective 0–1 span of a fixture motion window on one axis (same baseline as the
 * mapping pad crosshair / resize handles).
 */
export function fixtureMotionAxisSpan(
  fixtureWindow: Window2D_t,
  axis: WindowAxis
): number {
  const axisWin = fixtureWindow[axis]
  if (axisWin === undefined) {
    return FIXTURE_MOTION_PAD_MIN_AXIS_SPAN
  }
  const w = axisWin.width
  if (Number.isFinite(w) && (w ?? 0) > 0) {
    return Math.min(1, Math.max(0, Number(w)))
  }
  return FIXTURE_MOTION_PAD_MIN_AXIS_SPAN
}

function window2DAxisPos(window: Window2D_t, axis: WindowAxis): number {
  const p = window[axis]?.pos
  if (Number.isFinite(p)) {
    return Number(p)
  }
  return axis === 'z' ? 1 : 0.5
}

/**
 * Maps a point on the fixture face (0–1 per axis) into parent motion-window space
 * for the mapping pad / spatial engine.
 */
export function mapFixtureFaceCoordToParentAxis(
  fixtureWindow: Window2D_t,
  axis: WindowAxis,
  faceCoord01: number
): number {
  const axisWin = fixtureWindow[axis]
  if (axisWin === undefined) {
    return axis === 'z' ? 1 : 0.5
  }
  const parentPos = window2DAxisPos(fixtureWindow, axis)
  const span = fixtureMotionAxisSpan(fixtureWindow, axis)
  return clampNormalized(parentPos + (clampNormalized(faceCoord01) - 0.5) * span)
}

function fallbackSubfixtureFaceCoord(
  subIndex: number,
  subCount: number,
  axis: WindowAxis
): number {
  if (axis !== 'x') {
    return 0.5
  }
  if (subCount <= 1) {
    return 0.5
  }
  return subIndex / (subCount - 1)
}

/**
 * Normalized X/Y on the fixture-mapping pad for one subfixture anchor.
 */
export function subfixtureMappingPadCoords(
  fixtureWindow: Window2D_t,
  fixtureType: FixtureType,
  resolvedEmitters: FixtureEmitterDefinition[],
  subIndex: number,
  horizontalAxis: WindowAxis,
  verticalAxis: WindowAxis
): { x: number; y: number } {
  const sub = fixtureType.subFixtures[subIndex]
  if (sub === undefined) {
    const anchor = fixtureWindow
    return {
      x: window2DAxisPos(anchor, horizontalAxis),
      y: window2DAxisPos(anchor, verticalAxis),
    }
  }

  const emitters = emittersForSubfixtureIndex(
    fixtureType,
    resolvedEmitters,
    subIndex
  )
  const centroid = computeEmitterCentroid(emitters)
  if (centroid !== null) {
    return {
      x: mapFixtureFaceCoordToParentAxis(
        fixtureWindow,
        horizontalAxis,
        axisComponentForWindowAxis(horizontalAxis, centroid)
      ),
      y: mapFixtureFaceCoordToParentAxis(
        fixtureWindow,
        verticalAxis,
        axisComponentForWindowAxis(verticalAxis, centroid)
      ),
    }
  }

  if (sub.relative_window !== undefined) {
    const parent = resolvedFixtureSubWindowInParent(fixtureWindow, sub)
    return {
      x: window2DAxisPos(parent, horizontalAxis),
      y: window2DAxisPos(parent, verticalAxis),
    }
  }

  const n = fixtureType.subFixtures.length
  return {
    x: mapFixtureFaceCoordToParentAxis(
      fixtureWindow,
      horizontalAxis,
      fallbackSubfixtureFaceCoord(subIndex, n, horizontalAxis)
    ),
    y: mapFixtureFaceCoordToParentAxis(
      fixtureWindow,
      verticalAxis,
      fallbackSubfixtureFaceCoord(subIndex, n, verticalAxis)
    ),
  }
}

function axisComponentForWindowAxis(
  axis: WindowAxis,
  point: { x: number; y: number; z: number }
): number {
  if (axis === 'x') return point.x
  if (axis === 'y') return point.y
  return point.z
}

/**
 * Parent-space motion window for a subfixture used as the **DMX mapping anchor**:
 * centroid of emitters whose channels are mapped to that sub (same rule as
 * {@link emittersForSubfixtureIndex}), merged into `relative_window` the same way as
 * lighting preview, then composed into the parent fixture window. Individual emitter
 * positions are layout detail around this anchor; spatial modulation uses this point.
 */
export function subfixtureMappingAnchorInParentWindow(
  fixtureWindow: Window2D_t,
  fixtureType: FixtureType,
  resolvedEmitters: FixtureEmitterDefinition[],
  subIndex: number
): Window2D_t {
  const sub = fixtureType.subFixtures[subIndex]
  if (sub === undefined) {
    return fixtureWindow
  }

  const emitters = emittersForSubfixtureIndex(
    fixtureType,
    resolvedEmitters,
    subIndex
  )
  const centroid = computeEmitterCentroid(emitters)

  const buildParentAxis = (
    axis: WindowAxis,
    faceFallback: number
  ): { pos: number; width: number } | undefined => {
    if (fixtureWindow[axis] === undefined) {
      return undefined
    }
    const explicit = sub.relative_window?.[axis]
    const widthOk =
      explicit?.width !== undefined &&
      Number.isFinite(explicit.width) &&
      explicit.width >= 0
    const width = widthOk ? explicit!.width! : 0
    if (explicit?.pos !== undefined && Number.isFinite(explicit.pos)) {
      const merged: Window2D_t = {
        [axis]: { pos: clampNormalized(explicit.pos), width },
      }
      const parent = window2DToParentCoords(merged, fixtureWindow)[axis]
      if (parent === undefined) {
        return undefined
      }
      return parent
    }
    const faceCoord =
      centroid !== null
        ? axisComponentForWindowAxis(axis, centroid)
        : faceFallback
    return {
      pos: mapFixtureFaceCoordToParentAxis(fixtureWindow, axis, faceCoord),
      width: width * fixtureMotionAxisSpan(fixtureWindow, axis),
    }
  }

  const n = fixtureType.subFixtures.length
  const out: Window2D_t = {}
  for (const axis of windowAxes) {
    const built = buildParentAxis(
      axis,
      fallbackSubfixtureFaceCoord(subIndex, n, axis)
    )
    if (built !== undefined) {
      out[axis] = built
    }
  }
  if (Object.keys(out).length > 0) {
    return out
  }
  return resolvedFixtureSubWindowInParent(fixtureWindow, sub)
}

/** Padding added on each side when converting model size to mapping-pad span. */
export const FIXTURE_MAPPING_MOTION_MARGIN_FT = 0.1

/**
 * Physical extent of the fixture body on a stage axis (feet), from the 3D model config.
 */
export function fixturePhysicalExtentFtOnStageAxis(
  model: Pick<
    FixtureModelConfig,
    'bodyShape' | 'width' | 'bodyHeight' | 'bodyDepth' | 'bodyDiameter' | 'kind'
  >,
  axis: WindowAxis,
  resolvedKind?: FixtureModelKind
): number {
  const kind =
    resolvedKind ?? (model.kind === 'auto' ? 'parCan' : model.kind)
  const face = fixtureFrontFaceDimensionsM({ ...model, kind })
  const faceWFt = face.faceWidthM / METERS_PER_FOOT
  const depthFt = Math.max(0.02, model.bodyDepth) / METERS_PER_FOOT
  const heightFt = Math.max(0.02, model.bodyHeight) / METERS_PER_FOOT

  if (axis === 'z') {
    return depthFt
  }
  if (model.bodyShape === 'cylinder') {
    return faceWFt
  }
  if (axis === 'x') {
    return faceWFt
  }
  return heightFt
}

/** 0–1 motion-window span from a physical extent on one stage axis. */
export function normalizedMotionSpanFromPhysicalFt(
  extentFt: number,
  stageAxisLengthFt: number
): number {
  const stageFt = Math.max(0.01, stageAxisLengthFt)
  const padded = Math.max(
    0.01,
    extentFt + FIXTURE_MAPPING_MOTION_MARGIN_FT * 2
  )
  const span = padded / stageFt
  const minSpan = 0.012
  return Math.min(1, Math.max(minSpan, span))
}

function expandPhysicalExtentWithEmitterLayoutFt(
  baseFt: number,
  emitters: FixtureEmitterDefinition[],
  axis: 'x' | 'y',
  faceWidthM: number,
  faceHeightM: number
): number {
  if (emitters.length === 0) {
    return baseFt
  }
  const faceM = Math.max(0.01, axis === 'x' ? faceWidthM : faceHeightM)
  const faceFt = faceM / METERS_PER_FOOT
  const vals = emitters.map((em) =>
    clampNormalized(axis === 'x' ? em.x : em.y)
  )
  const normSpread = Math.max(...vals) - Math.min(...vals)
  let maxEmitterFt = 0
  for (const emitter of emitters) {
    const dims = normalizeRectEmitterFaceDimensionsM(emitter)
    const emFt =
      (axis === 'x' ? dims.widthM : dims.heightM) / METERS_PER_FOOT
    maxEmitterFt = Math.max(maxEmitterFt, emFt)
  }
  return Math.max(baseFt, normSpread * faceFt + maxEmitterFt)
}

/**
 * Suggested motion-window axis widths (0–1) when stored widths are still zero.
 * Uses fixture model dimensions vs stage size when `stage` is provided.
 */
export function suggestedFixtureMotionWindowWidths(
  fixtureWindow: Window2D_t,
  fixtureType: FixtureType,
  resolvedEmitters: FixtureEmitterDefinition[],
  stage?: StageDimensions
): Partial<Record<WindowAxis, number>> {
  const out: Partial<Record<WindowAxis, number>> = {}
  const model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)
  const effectiveKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const face = fixtureFrontFaceDimensionsM({ ...model, kind: effectiveKind })

  const trySetAxis = (axis: WindowAxis, span: number) => {
    const winAxis = fixtureWindow[axis]
    if (!winAxis || (winAxis.width ?? 0) > 1e-8) {
      return
    }
    out[axis] = Math.min(1, Math.max(0.012, span))
  }

  if (stage !== undefined) {
    for (const axis of windowAxes) {
      if (fixtureWindow[axis] === undefined) {
        continue
      }
      let extentFt = fixturePhysicalExtentFtOnStageAxis(
        { ...model, kind: effectiveKind },
        axis,
        effectiveKind
      )
      if (
        (axis === 'x' || axis === 'y') &&
        resolvedEmitters.length > 0
      ) {
        extentFt = expandPhysicalExtentWithEmitterLayoutFt(
          extentFt,
          resolvedEmitters,
          axis,
          face.faceWidthM,
          face.faceHeightM
        )
      }
      trySetAxis(
        axis,
        normalizedMotionSpanFromPhysicalFt(
          extentFt,
          stageAxisLengthFt(stage, axis)
        )
      )
    }
    return out
  }

  const margin = 0.07
  const minSpan = 0.11

  const setAxisFromNormalizedSpread = (axis: WindowAxis, spread: number) => {
    const winAxis = fixtureWindow[axis]
    if (!winAxis || (winAxis.width ?? 0) > 1e-8) {
      return
    }
    const w = Math.min(1, Math.max(minSpan, spread + margin))
    out[axis] = w
  }

  if (fixtureType.subFixtures.length > 0) {
    const centers = fixtureType.subFixtures.map((_, subIndex) => {
      const pad = subfixtureMappingPadCoords(
        fixtureWindow,
        fixtureType,
        resolvedEmitters,
        subIndex,
        'x',
        'y'
      )
      return {
        x: pad.x,
        y: pad.y,
        z: mapFixtureFaceCoordToParentAxis(fixtureWindow, 'z', 0.5),
      }
    })
    for (const axis of windowAxes) {
      const vals = centers.map((c) => c[axis])
      let spread = Math.max(...vals) - Math.min(...vals)
      if (resolvedEmitters.length > 0 && (axis === 'x' || axis === 'y')) {
        const faceCoord = (em: FixtureEmitterDefinition) =>
          clampNormalized(axis === 'x' ? em.x : em.y)
        const mapped = resolvedEmitters.map((em) =>
          mapFixtureFaceCoordToParentAxis(fixtureWindow, axis, faceCoord(em))
        )
        const emitterSpread = Math.max(...mapped) - Math.min(...mapped)
        spread = Math.max(spread, emitterSpread)
      }
      setAxisFromNormalizedSpread(axis, spread)
    }
    return out
  }

  if (resolvedEmitters.length === 0) {
    return out
  }
  for (const axis of windowAxes) {
    const vals = resolvedEmitters.map((em) =>
      clampNormalized(axis === 'x' ? em.x : axis === 'y' ? em.y : em.z)
    )
    const spread = Math.max(...vals) - Math.min(...vals)
    setAxisFromNormalizedSpread(axis, spread)
  }
  return out
}

/**
 * Fills missing `relative_window` axes from emitter-layout centroid so spatial
 * modulation matches physical subfixture placement on the fixture face.
 * Explicit relative positions always win.
 */
export function mergeSubRelativeWindowWithEmitterCentroid(
  explicit: Window2D_t | undefined,
  centroid: { x: number; y: number; z: number },
  parentWindow: Window2D_t
): Window2D_t {
  const out: Window2D_t = {}
  for (const axis of windowAxes) {
    if (parentWindow[axis] === undefined) continue
    const ex = explicit?.[axis]
    const widthOk =
      ex?.width !== undefined && Number.isFinite(ex.width) && ex.width >= 0
    const width = widthOk ? ex!.width! : 0
    if (ex?.pos !== undefined && Number.isFinite(ex.pos)) {
      out[axis] = {
        pos: clampNormalized(ex.pos),
        width,
      }
    } else {
      out[axis] = {
        pos: clampNormalized(centroid[axis]),
        width,
      }
    }
  }
  return out
}

export function resolvedEmittersForFixtureType(
  fixtureType: FixtureType
): FixtureEmitterDefinition[] {
  const model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)
  if (model.useCustomEmitterLayout && model.customEmitters.length > 0) {
    return model.customEmitters
  }
  return buildAutoFittedDefaultCustomEmitters(fixtureType, model)
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

/** 0-based subfixture index → a, b, …, z, aa, ab, … (Excel-style after z). */
export function subFixtureLabel(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    return 'a'
  }
  let i = Math.floor(index)
  let result = ''
  do {
    result = String.fromCharCode(97 + (i % 26)) + result
    i = Math.floor(i / 26) - 1
  } while (i >= 0)
  return result
}

/** Pre–double-letter scheme: index 26+ used ASCII past z (`{`, `|`, …). */
export function legacySubFixtureLabel(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    return 'a'
  }
  return String.fromCharCode(Math.floor(index) + 97)
}

/** Legacy single-character labels that differ from {@link subFixtureLabel}. */
export function buildLegacySubFixtureLabelRemap(
  maxIndexExclusive = 256
): Map<string, string> {
  const remap = new Map<string, string>()
  const limit = Math.max(0, Math.min(256, Math.floor(maxIndexExclusive)))
  for (let i = 0; i < limit; i++) {
    const legacy = legacySubFixtureLabel(i)
    const modern = subFixtureLabel(i)
    if (legacy !== modern) {
      remap.set(legacy, modern)
    }
  }
  return remap
}

export const LEGACY_SUB_FIXTURE_LABEL_REMAP = buildLegacySubFixtureLabelRemap()

export function remapLegacySubFixtureGroupNames(
  groups: string[],
  remap: Map<string, string> = LEGACY_SUB_FIXTURE_LABEL_REMAP
): string[] {
  return groups.map((group) => remap.get(group) ?? group)
}

export function remapLegacySubFixtureGroupRecord(
  groups: { [key: string]: boolean | undefined },
  remap: Map<string, string> = LEGACY_SUB_FIXTURE_LABEL_REMAP
): void {
  for (const [legacy, modern] of remap) {
    if (groups[legacy] === undefined) {
      continue
    }
    groups[modern] = groups[legacy]
    delete groups[legacy]
  }
}

/** Rename subfixture groups (and matching names) saved with legacy ASCII labels. */
export function migrateLegacySubFixtureGroupLabelsOnFixtureType(
  fixtureType: FixtureType,
  remap: Map<string, string> = LEGACY_SUB_FIXTURE_LABEL_REMAP
): void {
  if (remap.size === 0) {
    return
  }
  fixtureType.groups = remapLegacySubFixtureGroupNames(fixtureType.groups, remap)
  for (const sub of fixtureType.subFixtures) {
    sub.groups = remapLegacySubFixtureGroupNames(sub.groups, remap)
    const renamed = remap.get(sub.name)
    if (renamed !== undefined) {
      sub.name = renamed
    }
  }
}

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
  groups: string[]
  fixtureId?: string
  fixtureTypeId?: string
  moverGroup?: string
  moverCalibration?: MoverCalibration
  moverBounds?: MoverBounds
  moverMountOrientation?: MoverMountOrientation
}




