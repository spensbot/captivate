import { Window2D_t } from '../shared/window'
import { ColorChannel, ColorKind } from './dmxColors'
import { nanoid } from 'nanoid'

export const DMX_MIN_VALUE = 0
export const DMX_MAX_VALUE = 255
export const DMX_NUM_CHANNELS = 512
export const DMX_MAX_UNIVERSES = 16
export const MOVER_MIN_TURNS = 0.25
export const MOVER_MAX_TURNS = 4
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

export type FixtureChannel =
  | ChannelMaster
  | ChannelColor
  | ChannelColorMap
  | ChannelGoboMap
  | ChannelStrobe
  | ChannelAxis
  | ChannelCustom

export type ChannelType = FixtureChannel['type']

export const channelTypes: ChannelType[] = [
  'master',
  'color',
  'colorMap',
  'goboMap',
  'strobe',
  'axis',
  'custom',
]

export function initFixtureChannel(
  type?: FixtureChannel['type']
): FixtureChannel {
  if (type === 'color') {
    return initChannelColor(0, 1)
  } else if (type === 'strobe') {
    return initChannelStrobe()
  } else if (type === 'axis') {
    return initChannelAxis('x', false)
  } else if (type === 'colorMap') {
    return initChannelColorMap([
      { max: 0, hue: 0, saturation: 1.0, kind: 'color' },
    ])
  } else if (type === 'goboMap') {
    return initChannelGoboMap([{ name: 'Open', max: DMX_MIN_VALUE }])
  } else if (type === 'custom') {
    return initChannelCustom('Custom')
  }
  return initChannelMaster()
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
  turns: number
  invert: boolean
}

export type MoverTiltCalibration = {
  min: number
  max: number
  down: number
  forward: number
  up: number
  home: number
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
      turns: 1,
      invert: false,
    },
    tilt: {
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
      down: DMX_MIN_VALUE,
      forward: 128,
      up: DMX_MAX_VALUE,
      home: 128,
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

export const fixtureModelKinds: FixtureModelKind[] = [
  'auto',
  'parCan',
  'washBar',
  'uplight',
  'moverSpot',
  'moverWash',
]

export function fixtureModelKindName(kind: FixtureModelKind): string {
  if (kind === 'auto') return 'Auto'
  if (kind === 'parCan') return 'PAR Can'
  if (kind === 'washBar') return 'Wash Bar'
  if (kind === 'uplight') return 'Uplight'
  if (kind === 'moverSpot') return 'Mover Spot/Beam'
  return 'Mover Wash'
}

export type FixtureModelConfig = {
  kind: FixtureModelKind
  emittersPerSubFixture: number
  width: number
  moverBeamAngleDeg: number
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

  return FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE
}

export function initFixtureModelConfig(): FixtureModelConfig {
  return {
    kind: 'auto',
    emittersPerSubFixture: 1,
    width: 1,
    moverBeamAngleDeg: FIXTURE_MODEL_DEFAULT_MOVER_SPOT_BEAM_ANGLE,
  }
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
  const hasPan = fixtureType.channels.some(
    (channel) => channel.type === 'axis' && channel.dir === 'x' && !channel.isFine
  )
  const hasTilt = fixtureType.channels.some(
    (channel) => channel.type === 'axis' && channel.dir === 'y' && !channel.isFine
  )
  return hasPan && hasTilt
}

export function fixtureTypeHasFocusChannel(fixtureType: FixtureType): boolean {
  return fixtureType.channels.some(
    (channel) =>
      channel.type === 'custom' &&
      channel.name.trim().toLowerCase().includes('focus')
  )
}

export function inferFixtureModelKind(fixtureType: FixtureType): FixtureModelKind {
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
          moverBeamAngleDeg?: unknown
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
      : 1

  const defaultWidth =
    normalizedKind === 'washBar'
      ? 2.2
      : normalizedKind === 'parCan' || normalizedKind === 'uplight'
      ? 0.45
      : 0.6
  const defaultMoverBeamAngleDeg =
    defaultMoverBeamAngleForModelKind(normalizedKind)

  const fixedEmitterCount = fixedEmitterCountForModelKind(normalizedKind)
  const requestedEmitters = clampModelEmitters(
    Number(source.emittersPerSubFixture ?? defaultEmitters)
  )

  return {
    kind,
    emittersPerSubFixture: fixedEmitterCount ?? requestedEmitters,
    width: clampModelWidth(Number(source.width ?? defaultWidth)),
    moverBeamAngleDeg: clampMoverBeamAngle(
      Number(source.moverBeamAngleDeg ?? defaultMoverBeamAngleDeg)
    ),
  }
}

export interface Fixture {
  id?: string
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




