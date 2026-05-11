import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  Fixture,
  FixtureType,
  Universe,
  FixtureChannel,
  FixtureRotation,
  ColorMapColor,
  initFixtureRotation,
  initMoverCalibration,
  initMoverBounds,
  initSubFixture,
  isMoverFixtureType,
  normalizeFixtureModelConfig,
  SubFixture,
  MoverBounds,
  MoverMountOrientation,
  DMX_MIN_VALUE,
  DMX_MAX_VALUE,
  DMX_MAX_UNIVERSES,
  fixtureChannelLeafChannels,
  MOVER_MIN_PAN_RANGE_DEG,
  MOVER_MAX_PAN_RANGE_DEG,
  MOVER_MIN_TILT_RANGE_DEG,
  MOVER_MAX_TILT_RANGE_DEG,
  MOVER_DEFAULT_PAN_RANGE_DEG,
  MOVER_DEFAULT_TILT_RANGE_DEG,
} from '../../shared/dmxFixtures'
import { clampNormalized } from '../../math/util'
import { defaultParamsList } from '../../shared/params'
import { initLedState, LedState } from './ledState'
import {
  initLedFixture,
  LedFixture,
  normalizeLedFixtureForRuntime,
} from '../../shared/ledFixtures'
import { Point } from '../../math/point'
import { nanoid } from 'nanoid'
import {
  StageDimensions,
  StageUnit,
  initStageDimensions,
  normalizeStageDimensions,
} from '../../shared/stage'

export interface DmxState {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: { [id: string]: FixtureType }
  activeFixtureType: null | string
  activeFixture: null | number
  activeUniverse: number
  activeSubFixture: null | number
  moverGroupByFixtureId: { [fixtureId: string]: string }
  stage: StageDimensions
  lighting3d: Lighting3DSettings
  led: LedState
}

export function getCustomChannels(dmx: DmxState): Set<string> {
  let result = new Set() as Set<string>

  for (const ftId of dmx.fixtureTypes) {
    for (const ch of dmx.fixtureTypesByID[ftId].channels.flatMap((channel) =>
      fixtureChannelLeafChannels(channel)
    )) {
      if (ch.type === 'custom' && ch.isControllable) {
        result.add(ch.name)
      }
    }
  }

  return result
}

function hasGoboMapChannels(dmx: DmxState): boolean {
  for (const ftId of dmx.fixtureTypes) {
    for (const ch of dmx.fixtureTypesByID[ftId].channels.flatMap((channel) =>
      fixtureChannelLeafChannels(channel)
    )) {
      if (ch.type === 'goboMap') {
        return true
      }
    }
  }

  return false
}
export function getAllParamKeys(dmx: DmxState): string[] {
  const keys = (defaultParamsList as string[]).concat(
    Array.from(getCustomChannels(dmx))
  )

  if (hasGoboMapChannels(dmx)) {
    keys.push('gobo')
  }

  return Array.from(new Set(keys))
}

interface SetFixtureWindowPayload {
  index: number
  x?: number
  y?: number
  z?: number
}

interface IncrementFixtureWindowPayload {
  index: number
  dWidth?: number
  dHeight?: number
  dDepth?: number
}

interface SetFixtureRotationPayload {
  index: number
  x?: number
  y?: number
  z?: number
}

interface SetFixtureNamePayload {
  index: number
  name: string
}

interface SetLedFixturePositionPayload {
  index: number
  x?: number
  y?: number
  z?: number
}

interface SetLedFixtureRotationPayload {
  index: number
  x?: number
  y?: number
  z?: number
}

interface SetFixtureWindowEnabledPayload {
  dimension: 'x' | 'y' | 'z'
  index: number
  isEnabled: boolean
}

interface SetStageDimensionsPayload {
  widthFt?: number
  heightFt?: number
  depthFt?: number
}

export interface Lighting3DSettings {
  showCurtain: boolean
  showBoundsOverlay: boolean
  environmentFog: number
  roomEnabled: boolean
  roomWidthFt: number
  roomDepthFt: number
  roomHeightFt: number
}

interface SetLighting3DSettingsPayload {
  showCurtain?: boolean
  showBoundsOverlay?: boolean
  environmentFog?: number
  roomEnabled?: boolean
  roomWidthFt?: number
  roomDepthFt?: number
  roomHeightFt?: number
}

const ATMOSPHERE_GROUP_NAME = 'Atmosphere'

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function toNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

export function initLighting3DSettings(): Lighting3DSettings {
  return {
    showCurtain: true,
    showBoundsOverlay: true,
    environmentFog: 0.65,
    roomEnabled: false,
    roomWidthFt: 36,
    roomDepthFt: 28,
    roomHeightFt: 12,
  }
}

export function normalizeLighting3DSettings(raw: unknown): Lighting3DSettings {
  const defaults = initLighting3DSettings()
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<Lighting3DSettings>

  return {
    showCurtain: toBoolean(source.showCurtain, defaults.showCurtain),
    showBoundsOverlay: toBoolean(
      source.showBoundsOverlay,
      defaults.showBoundsOverlay
    ),
    environmentFog: clampNumber(
      toNumber(source.environmentFog, defaults.environmentFog),
      0,
      1
    ),
    roomEnabled: toBoolean(source.roomEnabled, defaults.roomEnabled),
    roomWidthFt: clampNumber(toNumber(source.roomWidthFt, defaults.roomWidthFt), 5, 400),
    roomDepthFt: clampNumber(toNumber(source.roomDepthFt, defaults.roomDepthFt), 5, 400),
    roomHeightFt: clampNumber(toNumber(source.roomHeightFt, defaults.roomHeightFt), 5, 120),
  }
}

export function initDmxState(): DmxState {
  return {
    universe: [],
    fixtureTypes: [],
    fixtureTypesByID: {},
    activeFixtureType: null,
    activeFixture: null,
    activeUniverse: 1,
    activeSubFixture: null,
    moverGroupByFixtureId: {},
    stage: initStageDimensions(),
    lighting3d: initLighting3DSettings(),
    led: initLedState(),
  }
}

function modifyActiveFixtureType(
  state: DmxState,
  f: (fixtureType: FixtureType) => void
) {
  if (state.activeFixtureType !== null) {
    const fixtureType = state.fixtureTypesByID[state.activeFixtureType]
    f(fixtureType)
  } else {
    console.error(
      `Tried to modifyActiveFixtureType when activeFixtureType is null`
    )
  }
}

function modifyActiveLedFixture(
  state: DmxState,
  f: (ledFixture: LedFixture) => void
) {
  if (state.led.activeFixture !== null) {
    const activeLedFixture = state.led.ledFixtures[state.led.activeFixture]
    f(activeLedFixture)
  } else {
    console.error(
      `Tried to modifyActiveLedFixture when led.activeFixture is null`
    )
  }
}

function add_noDuplicates<T>(t: T, ts: T[]): T[] {
  const set = new Set(ts)
  set.add(t)
  return Array.from(set)
}

function remove_noDuplicates<T>(t: T, ts: T[]): T[] {
  const set = new Set(ts)
  set.delete(t)
  return Array.from(set)
}

function clampUniverse(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(DMX_MAX_UNIVERSES, Math.max(1, Math.round(value)))
}

function defaultFixtureAxisPos(axis: 'x' | 'y' | 'z'): number {
  return axis === 'z' ? 1 : 0.5
}

function normalizeFixtureRotationAxis(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }

  const wrapped = ((numeric + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 ? 180 : wrapped
}

function normalizeFixtureRotation(rotation: unknown): FixtureRotation {
  const source = (rotation !== null && typeof rotation === 'object'
    ? rotation
    : {}) as {
    x?: unknown
    y?: unknown
    z?: unknown
  }

  const defaults = initFixtureRotation()
  return {
    x: normalizeFixtureRotationAxis(source.x ?? defaults.x),
    y: normalizeFixtureRotationAxis(source.y ?? defaults.y),
    z: normalizeFixtureRotationAxis(source.z ?? defaults.z),
  }
}

function ensureFixtureRotation(fixture: Fixture) {
  fixture.rotation = normalizeFixtureRotation(fixture.rotation)
}

function ensureFixtureId(fixture: Fixture): string {
  if (typeof fixture.id === 'string' && fixture.id.trim().length > 0) {
    return fixture.id
  }
  fixture.id = nanoid()
  return fixture.id
}

function getDefaultMoverGroupName(
  fixture: Fixture,
  fixtureType: FixtureType | undefined
): string {
  const firstFixtureGroup = fixture.groups.find((group) => group.trim().length > 0)
  if (firstFixtureGroup !== undefined) {
    return firstFixtureGroup
  }

  const firstTypeGroup = fixtureType?.groups.find((group) => group.trim().length > 0)
  if (firstTypeGroup !== undefined) {
    return firstTypeGroup
  }

  return fixtureType?.name?.trim() || 'Mover Group'
}

function clampDmxValue(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function normalizeMoverCalibration(calibration: unknown) {
  const defaults = initMoverCalibration()
  const source = (calibration !== null && typeof calibration === 'object'
    ? calibration
    : {}) as {
    pan?: {
      min?: unknown
      max?: unknown
      front?: unknown
      back?: unknown
      home?: unknown
      rangeDeg?: unknown
      turns?: unknown
      invert?: unknown
    }
    tilt?: {
      min?: unknown
      max?: unknown
      down?: unknown
      forward?: unknown
      up?: unknown
      home?: unknown
      rangeDeg?: unknown
      invert?: unknown
    }
  }

  const rawValues = [
    Number(source.pan?.min),
    Number(source.pan?.max),
    Number(source.pan?.front),
    Number(source.pan?.back),
    Number(source.pan?.home),
    Number(source.tilt?.min),
    Number(source.tilt?.max),
    Number(source.tilt?.down),
    Number(source.tilt?.forward),
    Number(source.tilt?.up),
    Number(source.tilt?.home),
  ].filter((value) => Number.isFinite(value))

  const isLegacyNormalized =
    rawValues.length > 0 && rawValues.every((value) => value >= 0 && value <= 1)

  const toDmx = (value: unknown, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return clampDmxValue(
      isLegacyNormalized ? numeric * DMX_MAX_VALUE : numeric,
      fallback
    )
  }

  const panRangeRaw = Number(source.pan?.rangeDeg)
  const turnsRaw = Number(source.pan?.turns)
  const panRangeDeg = Number.isFinite(panRangeRaw)
    ? Math.max(MOVER_MIN_PAN_RANGE_DEG, Math.min(MOVER_MAX_PAN_RANGE_DEG, panRangeRaw))
    : Number.isFinite(turnsRaw)
    ? Math.max(
        MOVER_MIN_PAN_RANGE_DEG,
        Math.min(MOVER_MAX_PAN_RANGE_DEG, turnsRaw * 360)
      )
    : defaults.pan.rangeDeg ?? MOVER_DEFAULT_PAN_RANGE_DEG

  const tiltRangeRaw = Number(source.tilt?.rangeDeg)
  const tiltRangeDeg = Number.isFinite(tiltRangeRaw)
    ? Math.max(MOVER_MIN_TILT_RANGE_DEG, Math.min(MOVER_MAX_TILT_RANGE_DEG, tiltRangeRaw))
    : defaults.tilt.rangeDeg ?? MOVER_DEFAULT_TILT_RANGE_DEG

  return {
    pan: {
      min: toDmx(source.pan?.min, defaults.pan.min),
      max: toDmx(source.pan?.max, defaults.pan.max),
      front: toDmx(source.pan?.front, defaults.pan.front),
      back: toDmx(source.pan?.back, defaults.pan.back),
      home: toDmx(source.pan?.home, defaults.pan.home),
      rangeDeg: panRangeDeg,
      invert: source.pan?.invert === true,
    },
    tilt: {
      min: toDmx(source.tilt?.min, defaults.tilt.min),
      max: toDmx(source.tilt?.max, defaults.tilt.max),
      down: toDmx(source.tilt?.down, defaults.tilt.down),
      forward: toDmx(source.tilt?.forward, defaults.tilt.forward),
      up: toDmx(source.tilt?.up, defaults.tilt.up),
      home: toDmx(source.tilt?.home, defaults.tilt.home),
      rangeDeg: tiltRangeDeg,
      invert: source.tilt?.invert === true,
    },
  }
}

function normalizeMoverBounds(bounds: unknown): MoverBounds {
  const defaults = initMoverBounds()
  const source = (bounds !== null && typeof bounds === 'object'
    ? bounds
    : {}) as {
    topLeft?: { pan?: unknown; tilt?: unknown }
    topRight?: { pan?: unknown; tilt?: unknown }
    bottomLeft?: { pan?: unknown; tilt?: unknown }
    bottomRight?: { pan?: unknown; tilt?: unknown }
  }

  const rawValues = [
    Number(source.topLeft?.pan),
    Number(source.topLeft?.tilt),
    Number(source.topRight?.pan),
    Number(source.topRight?.tilt),
    Number(source.bottomLeft?.pan),
    Number(source.bottomLeft?.tilt),
    Number(source.bottomRight?.pan),
    Number(source.bottomRight?.tilt),
  ].filter((value) => Number.isFinite(value))

  const isLegacyNormalized =
    rawValues.length > 0 && rawValues.every((value) => value >= 0 && value <= 1)

  const toDmx = (value: unknown, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return clampDmxValue(
      isLegacyNormalized ? numeric * DMX_MAX_VALUE : numeric,
      fallback
    )
  }

  return {
    topLeft: {
      pan: toDmx(source.topLeft?.pan, defaults.topLeft.pan),
      tilt: toDmx(source.topLeft?.tilt, defaults.topLeft.tilt),
    },
    topRight: {
      pan: toDmx(source.topRight?.pan, defaults.topRight.pan),
      tilt: toDmx(source.topRight?.tilt, defaults.topRight.tilt),
    },
    bottomLeft: {
      pan: toDmx(source.bottomLeft?.pan, defaults.bottomLeft.pan),
      tilt: toDmx(source.bottomLeft?.tilt, defaults.bottomLeft.tilt),
    },
    bottomRight: {
      pan: toDmx(source.bottomRight?.pan, defaults.bottomRight.pan),
      tilt: toDmx(source.bottomRight?.tilt, defaults.bottomRight.tilt),
    },
  }
}

function normalizeMoverMountOrientation(
  orientation: unknown
): MoverMountOrientation {
  return orientation === 'inverted' ? 'inverted' : 'upright'
}
function ensureMoverCalibration(fixtureType: FixtureType) {
  fixtureType.model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)

  if (isMoverFixtureType(fixtureType)) {
    fixtureType.moverCalibration = normalizeMoverCalibration(
      fixtureType.moverCalibration
    )
  }
}

function ensureMoverGroupForFixture(state: DmxState, fixture: Fixture) {
  const fixtureType = state.fixtureTypesByID[fixture.type]
  if (fixtureType === undefined || !isMoverFixtureType(fixtureType)) {
    return
  }

  const fixtureId = ensureFixtureId(fixture)
  if (state.moverGroupByFixtureId[fixtureId] === undefined) {
    state.moverGroupByFixtureId[fixtureId] = getDefaultMoverGroupName(
      fixture,
      fixtureType
    )
  }
}

function isAtmosphereFixtureType(fixtureType: FixtureType): boolean {
  return fixtureType.channels
    .flatMap((channel) => fixtureChannelLeafChannels(channel))
    .some((channel) => {
      if (channel.type === 'fxtrTrigger' || channel.type === 'fxtrLevel') {
        return true
      }
      if (channel.type !== 'custom' || channel.isControllable !== true) {
        return false
      }
      const name = channel.name.trim().toLowerCase()
      if (name.length <= 0) {
        return false
      }
      const exclusions = ['pan', 'tilt', 'speed', 'gobo', 'zoom', 'focus']
      if (exclusions.some((token) => name.includes(token))) {
        return false
      }
      const keywords = [
        'volume',
        'fan',
        'fog',
        'haze',
        'bubble',
        'confetti',
        'co2',
        'flame',
        'pyro',
        'output',
        'pump',
        'mist',
        'jet',
        'trigger',
        'on/off',
        'on off',
        'onoff',
        'fx',
      ]
      return keywords.some((token) => name.includes(token))
    })
}

function ensureAtmosphereGroupForFixture(state: DmxState, fixture: Fixture) {
  const fixtureType = state.fixtureTypesByID[fixture.type]
  if (fixtureType === undefined || !isAtmosphereFixtureType(fixtureType)) {
    return
  }
  const hasAtmosphereGroup = fixture.groups.some(
    (group) => group.trim().toLowerCase() === ATMOSPHERE_GROUP_NAME.toLowerCase()
  )
  if (!hasAtmosphereGroup) {
    fixture.groups.push(ATMOSPHERE_GROUP_NAME)
  }
}

function syncMoverState(state: DmxState) {
  const validFixtureIds = new Set<string>()

  for (const fixtureTypeId of state.fixtureTypes) {
    const fixtureType = state.fixtureTypesByID[fixtureTypeId]
    if (fixtureType !== undefined) {
      ensureMoverCalibration(fixtureType)
    }
  }

  for (const fixture of state.universe) {
    const fixtureId = ensureFixtureId(fixture)
    validFixtureIds.add(fixtureId)
    ensureFixtureRotation(fixture)

    if (fixture.moverBounds !== undefined) {
      fixture.moverBounds = normalizeMoverBounds(fixture.moverBounds)
    }
    fixture.moverMountOrientation = normalizeMoverMountOrientation(
      fixture.moverMountOrientation
    )

    ensureMoverGroupForFixture(state, fixture)
    ensureAtmosphereGroupForFixture(state, fixture)
  }

  for (const fixtureId of Object.keys(state.moverGroupByFixtureId)) {
    if (!validFixtureIds.has(fixtureId)) {
      delete state.moverGroupByFixtureId[fixtureId]
    }
  }
}

function incrementNumberSuffix(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '2'

  const match = trimmed.match(/^(.*?)(?:\s+(\d+))$/)
  if (match) {
    const prefix = match[1].trim()
    const value = Number(match[2])
    const next = Number.isFinite(value) ? value + 1 : 2
    return prefix.length > 0 ? `${prefix} ${next}` : `${next}`
  }

  return `${trimmed} 2`
}

function duplicateFixtureChannel(channel: FixtureChannel): FixtureChannel {
  const duplicated = JSON.parse(JSON.stringify(channel)) as FixtureChannel
  if (duplicated.type === 'custom') {
    duplicated.name = incrementNumberSuffix(duplicated.name)
  } else if (duplicated.type === 'split') {
    duplicated.ranges = duplicated.ranges.map((range) => {
      if (range.channel.type === 'custom') {
        return {
          ...range,
          channel: {
            ...range.channel,
            name: incrementNumberSuffix(range.channel.name),
          },
        }
      }
      return range
    })
  }
  return duplicated
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initDmxState(),
  reducers: {
    setSelectedFixture: (state, { payload }: PayloadAction<number>) => {
      state.activeFixture = payload
      const fixture = state.universe[payload]
      if (fixture) {
        state.activeUniverse = clampUniverse(fixture.universe)
      }
    },
    addFixture: (state, { payload }: PayloadAction<Fixture>) => {
      const fixtureType = state.fixtureTypesByID[payload.type]
      if (fixtureType === undefined || fixtureType.channels.length <= 0) {
        return
      }
      const fixture = {
        ...payload,
        universe: clampUniverse(payload.universe ?? state.activeUniverse),
      }
      if (fixture.moverBounds !== undefined) {
        fixture.moverBounds = normalizeMoverBounds(fixture.moverBounds)
      }
      fixture.moverMountOrientation = normalizeMoverMountOrientation(
        fixture.moverMountOrientation
      )
      ensureFixtureRotation(fixture)
      ensureFixtureId(fixture)
      state.universe.push(fixture)
      state.universe.sort((a, b) => {
        if (a.universe === b.universe) return a.ch - b.ch
        return a.universe - b.universe
      })
      state.activeUniverse = fixture.universe
      state.activeFixture = state.universe.findIndex(
        (other) =>
          other.id === fixture.id ||
          (other.universe === fixture.universe &&
            other.ch === fixture.ch &&
            other.type === fixture.type)
      )
      syncMoverState(state)
    },
    setActiveUniverse: (state, { payload }: PayloadAction<number>) => {
      state.activeUniverse = clampUniverse(payload)
      if (
        state.activeFixture !== null &&
        state.universe[state.activeFixture]?.universe !== state.activeUniverse
      ) {
        state.activeFixture = null
      }
    },
    removeFixture: (state, { payload }: PayloadAction<number>) => {
      state.activeFixture = null
      const fixture = state.universe[payload]
      state.universe.splice(payload, 1)
      if (fixture?.id) {
        delete state.moverGroupByFixtureId[fixture.id]
      }
      syncMoverState(state)
    },
    setFixtureWindow: (
      state,
      { payload }: PayloadAction<SetFixtureWindowPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (window.x && payload.x !== undefined) {
        window.x.pos = clampNormalized(payload.x)
      }
      if (window.y && payload.y !== undefined) {
        window.y.pos = clampNormalized(payload.y)
      }
      if (window.z && payload.z !== undefined) {
        window.z.pos = clampNormalized(payload.z)
      }
    },
    setFixtureWindowEnabled: (
      state,
      { payload }: PayloadAction<SetFixtureWindowEnabledPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (payload.isEnabled) {
        window[payload.dimension] = {
          pos: defaultFixtureAxisPos(payload.dimension),
          width: 0,
        }
      } else {
        delete window[payload.dimension]
      }
    },
    incrementFixtureWindow: (
      state,
      { payload }: PayloadAction<IncrementFixtureWindowPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (window.x && payload.dWidth !== undefined) {
        window.x.width = clampNormalized(window.x.width + payload.dWidth)
      }
      if (window.y && payload.dHeight !== undefined) {
        window.y.width = clampNormalized(window.y.width + payload.dHeight)
      }
      if (window.z && payload.dDepth !== undefined) {
        window.z.width = clampNormalized(window.z.width + payload.dDepth)
      }
    },
    setFixtureRotation: (
      state,
      { payload }: PayloadAction<SetFixtureRotationPayload>
    ) => {
      const fixture = state.universe[payload.index]
      if (fixture === undefined) {
        return
      }

      const current = normalizeFixtureRotation(fixture.rotation)
      fixture.rotation = {
        x:
          payload.x === undefined
            ? current.x
            : normalizeFixtureRotationAxis(payload.x),
        y:
          payload.y === undefined
            ? current.y
            : normalizeFixtureRotationAxis(payload.y),
        z:
          payload.z === undefined
            ? current.z
            : normalizeFixtureRotationAxis(payload.z),
      }
    },
    setFixtureName: (state, { payload }: PayloadAction<SetFixtureNamePayload>) => {
      const fixture = state.universe[payload.index]
      if (fixture === undefined) {
        return
      }

      const trimmedName = payload.name.trim()
      if (trimmedName.length === 0) {
        delete fixture.name
      } else {
        fixture.name = trimmedName
      }
    },
    setStageUnits: (state, { payload }: PayloadAction<StageUnit>) => {
      state.stage = normalizeStageDimensions({
        ...state.stage,
        unit: payload,
      })
    },
    setStageDimensions: (
      state,
      { payload }: PayloadAction<SetStageDimensionsPayload>
    ) => {
      state.stage = normalizeStageDimensions({
        ...state.stage,
        ...payload,
      })
    },
    setLighting3DSettings: (
      state,
      { payload }: PayloadAction<SetLighting3DSettingsPayload>
    ) => {
      state.lighting3d = normalizeLighting3DSettings({
        ...state.lighting3d,
        ...payload,
      })
    },
    addActiveFixtureTypeGroup: (state, { payload }: PayloadAction<string>) => {
      modifyActiveFixtureType(
        state,
        (ft) => (ft.groups = add_noDuplicates(payload, ft.groups))
      )
      syncMoverState(state)
    },
    removeActiveFixtureTypeGroup: (
      state,
      { payload }: PayloadAction<string>
    ) => {
      modifyActiveFixtureType(
        state,
        (ft) => (ft.groups = remove_noDuplicates(payload, ft.groups))
      )
      syncMoverState(state)
    },
    setEditedFixture: (state, { payload }: PayloadAction<null | string>) => {
      state.activeFixtureType = payload
      state.activeSubFixture = null
    },
    addFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      ensureMoverCalibration(payload)
      state.fixtureTypes.push(payload.id)
      state.fixtureTypesByID[payload.id] = payload
      state.activeFixtureType = payload.id
      syncMoverState(state)
    },
    updateFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      ensureMoverCalibration(payload)
      state.fixtureTypesByID[payload.id] = payload
      syncMoverState(state)
    },
    addFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        newChannel: FixtureChannel
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels.push(
        payload.newChannel
      )
      syncMoverState(state)
    },
    editFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        channelIndex: number
        newChannel: FixtureChannel
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels[payload.channelIndex] =
        payload.newChannel
      syncMoverState(state)
    },
    removeFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        channelIndex: number
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels.splice(
        payload.channelIndex,
        1
      )
      syncMoverState(state)
    },
    reorderFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        fromIndex: number
        toIndex: number
      }>
    ) => {
      const fixture = state.fixtureTypesByID[payload.fixtureID]
      const element = fixture.channels.splice(payload.fromIndex, 1)[0]
      fixture.channels.splice(payload.toIndex, 0, element)
      syncMoverState(state)
    },
    deleteFixtureType: (state, { payload }: PayloadAction<string>) => {
      const index = state.fixtureTypes.indexOf(payload)
      if (index !== -1) {
        state.fixtureTypes.splice(index, 1)
      }
      delete state.fixtureTypesByID[payload]
      state.activeFixtureType = null
      syncMoverState(state)
    },
    addColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex },
      }: PayloadAction<{ fixtureTypeId: string; channelIndex: number }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        const lastColorMax = channel.colors[channel.colors.length - 1]?.max
        channel.colors.push({
          max: lastColorMax ?? 0,
          hue: 0,
          saturation: 1.0,
          kind: 'color',
        })
      } else {
        console.error(
          `Tried to addColorMapColor to non-coloMap channel: ${channelIndex}`
        )
      }
    },
    removeColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex },
      }: PayloadAction<{ fixtureTypeId: string; channelIndex: number }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        channel.colors.pop()
      } else {
        console.error(
          `Tried to removeColorMapColor to non-colorMap channel: ${channelIndex}`
        )
      }
    },
    setColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex, colorIndex, newColor },
      }: PayloadAction<{
        fixtureTypeId: string
        channelIndex: number
        colorIndex: number
        newColor: ColorMapColor
      }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        channel.colors[colorIndex] = newColor
      } else {
        console.error(
          `Tried to setColorMapColor to non-colorMap channel: ${channelIndex}`
        )
      }
    },
    addSubFixture: (state, _: PayloadAction<undefined>) => {
      modifyActiveFixtureType(state, (ft) => {
        ft.subFixtures.push(initSubFixture())
        state.activeSubFixture = ft.subFixtures.length - 1
      })
    },
    duplicateSubFixture: (
      state,
      { payload }: PayloadAction<number | undefined>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        if (ft.subFixtures.length === 0) return

        const sourceIndex = payload ?? ft.subFixtures.length - 1
        const sourceSubFixture = ft.subFixtures[sourceIndex]
        if (sourceSubFixture === undefined) return

        const sourceChannels = [...sourceSubFixture.channels]
        const channelOffset = sourceChannels.length
        const shiftedChannels = sourceChannels
          .map((channelIndex) => channelIndex + channelOffset)
          .filter(
            (channelIndex) =>
              channelIndex >= 0 && channelIndex < ft.channels.length
          )

        const channelsAssignedToOthers = new Set<number>()
        ft.subFixtures.forEach((subFixture, subFixtureIndex) => {
          if (subFixtureIndex !== sourceIndex) {
            for (const channelIndex of subFixture.channels) {
              channelsAssignedToOthers.add(channelIndex)
            }
          }
        })

        const canUseShiftedChannels =
          sourceChannels.length > 0 &&
          shiftedChannels.length === sourceChannels.length &&
          shiftedChannels.every(
            (channelIndex) => !channelsAssignedToOthers.has(channelIndex)
          )

        let duplicatedChannels: number[] = []
        if (canUseShiftedChannels) {
          duplicatedChannels = shiftedChannels
        } else {
          for (const sourceChannelIndex of sourceChannels) {
            const sourceChannel = ft.channels[sourceChannelIndex]
            if (sourceChannel === undefined) continue
            ft.channels.push(duplicateFixtureChannel(sourceChannel))
            duplicatedChannels.push(ft.channels.length - 1)
          }
        }

        const duplicatedChannelSet = new Set(duplicatedChannels)
        // Channel assignments are exclusive between subfixtures.
        if (duplicatedChannelSet.size > 0) {
          for (const subFixture of ft.subFixtures) {
            subFixture.channels = subFixture.channels.filter(
              (channelIndex) => !duplicatedChannelSet.has(channelIndex)
            )
          }
        }

        const duplicatedSubFixture: SubFixture = {
          ...sourceSubFixture,
          name: incrementNumberSuffix(sourceSubFixture.name),
          channels: duplicatedChannels,
          groups: [...sourceSubFixture.groups],
          relative_window: sourceSubFixture.relative_window
            ? {
                x: sourceSubFixture.relative_window.x
                  ? { ...sourceSubFixture.relative_window.x }
                  : undefined,
                y: sourceSubFixture.relative_window.y
                  ? { ...sourceSubFixture.relative_window.y }
                  : undefined,
                z: sourceSubFixture.relative_window.z
                  ? { ...sourceSubFixture.relative_window.z }
                  : undefined,
              }
            : undefined,
        }

        ft.subFixtures.push(duplicatedSubFixture)
        state.activeSubFixture = ft.subFixtures.length - 1
      })
    },
    removeSubFixture: (state, { payload }: PayloadAction<number>) => {
      modifyActiveFixtureType(state, (ft) => ft.subFixtures.splice(payload, 1))
      state.activeSubFixture = null
    },
    setActiveSubFixture: (state, { payload }: PayloadAction<number | null>) => {
      state.activeSubFixture = payload
    },
    setMoverGroupForFixture: (
      state,
      {
        payload,
      }: PayloadAction<{ fixtureId: string; groupName: string }>
    ) => {
      const trimmedGroupName = payload.groupName.trim()
      if (trimmedGroupName.length > 0) {
        state.moverGroupByFixtureId[payload.fixtureId] = trimmedGroupName
      } else {
        delete state.moverGroupByFixtureId[payload.fixtureId]
        const fixture = state.universe.find((candidate) => candidate.id === payload.fixtureId)
        if (fixture !== undefined) {
          ensureMoverGroupForFixture(state, fixture)
        }
      }
    },
    setFixtureMoverBounds: (
      state,
      {
        payload,
      }: PayloadAction<{ fixtureId: string; moverBounds: MoverBounds }>
    ) => {
      const fixture = state.universe.find((candidate) => candidate.id === payload.fixtureId)
      if (fixture === undefined) {
        return
      }

      fixture.moverBounds = normalizeMoverBounds(payload.moverBounds)
    },
    setFixtureMoverMountOrientation: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureId: string
        orientation: MoverMountOrientation
      }>
    ) => {
      const fixture = state.universe.find((candidate) => candidate.id === payload.fixtureId)
      if (fixture === undefined) {
        return
      }

      fixture.moverMountOrientation = normalizeMoverMountOrientation(
        payload.orientation
      )
    },
    assignChannelToSubFixture: (
      state,
      {
        payload: { channelIndex, subFixtureIndex },
      }: PayloadAction<{
        channelIndex: number
        subFixtureIndex: number
      }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        for (const subFixture of ft.subFixtures) {
          subFixture.channels = remove_noDuplicates(
            channelIndex,
            subFixture.channels
          )
        }

        ft.subFixtures[subFixtureIndex].channels.push(channelIndex)
      })
    },
    removeChannelFromSubFixtures: (
      state,
      {
        payload: { channelIndex },
      }: PayloadAction<{
        channelIndex: number
      }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        for (const subFixture of ft.subFixtures) {
          subFixture.channels = remove_noDuplicates(
            channelIndex,
            subFixture.channels
          )
        }
      })
    },
    replaceActiveFixtureTypeSubFixture: (
      state,
      {
        payload,
      }: PayloadAction<{ subFixtureIndex: number; subFixture: SubFixture }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        ft.subFixtures[payload.subFixtureIndex] = payload.subFixture
      })
    },
    setActiveLedFixture: (state, { payload }: PayloadAction<number | null>) => {
      state.led.activeFixture = payload
    },
    updateActiveLedFixture: (state, { payload }: PayloadAction<LedFixture>) => {
      if (state.led.activeFixture !== null) {
        state.led.ledFixtures[state.led.activeFixture] =
          normalizeLedFixtureForRuntime(payload)
      }
    },
    setLedFixturePosition: (
      state,
      { payload }: PayloadAction<SetLedFixturePositionPayload>
    ) => {
      const fixture = state.led.ledFixtures[payload.index]
      if (fixture === undefined) return
      fixture.position = {
        x:
          payload.x === undefined
            ? fixture.position.x
            : clampNormalized(payload.x),
        y:
          payload.y === undefined
            ? fixture.position.y
            : clampNormalized(payload.y),
        z:
          payload.z === undefined
            ? fixture.position.z
            : clampNormalized(payload.z),
      }
    },
    setLedFixtureRotation: (
      state,
      { payload }: PayloadAction<SetLedFixtureRotationPayload>
    ) => {
      const fixture = state.led.ledFixtures[payload.index]
      if (fixture === undefined) return
      fixture.rotation = {
        x:
          payload.x === undefined
            ? fixture.rotation.x
            : normalizeFixtureRotationAxis(payload.x),
        y:
          payload.y === undefined
            ? fixture.rotation.y
            : normalizeFixtureRotationAxis(payload.y),
        z:
          payload.z === undefined
            ? fixture.rotation.z
            : normalizeFixtureRotationAxis(payload.z),
      }
    },
    addLedFixture: (state, _: PayloadAction<undefined>) => {
      state.led.ledFixtures.push(initLedFixture())
      state.led.activeFixture = state.led.ledFixtures.length - 1
    },
    removeLedFixture: (state, { payload }: PayloadAction<number>) => {
      state.led.activeFixture = null
      state.led.ledFixtures.splice(payload, 1)
    },
    addLedFixturePoint: (state, { payload }: PayloadAction<Point>) => {
      modifyActiveLedFixture(state, (f) => {
        if (f.kind !== 'string') return
        f.points.push({
          x: clampNormalized(payload.x),
          y: clampNormalized(payload.y),
        })
      })
    },
    removeLedFixturePoint: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLedFixture(state, (f) => {
        if (f.kind !== 'string') return
        f.points.splice(payload, 1)
      })
    },
    updateLedFixturePoint: (
      state,
      { payload }: PayloadAction<{ index: number; newPoint: Point }>
    ) => {
      modifyActiveLedFixture(state, (f) => {
        if (f.kind !== 'string') return
        f.points[payload.index] = {
          x: clampNormalized(payload.newPoint.x),
          y: clampNormalized(payload.newPoint.y),
        }
      })
    },
  },
})

export const {
  setSelectedFixture,
  setActiveUniverse,
  setEditedFixture,
  setFixtureWindow,
  setFixtureWindowEnabled,
  incrementFixtureWindow,
  setFixtureRotation,
  setFixtureName,
  setStageUnits,
  setStageDimensions,
  setLighting3DSettings,
  addFixture,
  removeFixture,
  addFixtureType,
  updateFixtureType,
  deleteFixtureType,
  addActiveFixtureTypeGroup,
  removeActiveFixtureTypeGroup,
  addFixtureChannel,
  editFixtureChannel,
  removeFixtureChannel,
  reorderFixtureChannel,
  addColorMapColor,
  removeColorMapColor,
  setColorMapColor,
  addSubFixture,
  duplicateSubFixture,
  removeSubFixture,
  setActiveSubFixture,
  setMoverGroupForFixture,
  setFixtureMoverBounds,
  setFixtureMoverMountOrientation,
  assignChannelToSubFixture,
  removeChannelFromSubFixtures,
  replaceActiveFixtureTypeSubFixture,
  setActiveLedFixture,
  updateActiveLedFixture,
  setLedFixturePosition,
  setLedFixtureRotation,
  addLedFixture,
  removeLedFixture,
  addLedFixturePoint,
  removeLedFixturePoint,
  updateLedFixturePoint,
} = dmxSlice.actions

export default dmxSlice.reducer
















