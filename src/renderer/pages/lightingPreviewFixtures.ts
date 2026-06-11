import type { DmxState } from '../redux/dmxSlice'
import {
  Fixture,
  FixtureType,
  LeafFixtureChannel,
  buildAutoFittedDefaultCustomEmitters,
  initFixtureModelConfig,
  MoverMountOrientation,
  isMoverFixtureType,
  computeEmitterCentroid,
  emittersForSubfixtureIndex,
  mergeSubRelativeWindowWithEmitterCentroid,
  normalizeFixtureModelConfig,
  resolveEmitterSubFixtureIndex,
} from '../../shared/dmxFixtures'
import {
  LedFixture,
  getLedPointLayout3D,
  normalizeLedFixtureForRuntime,
} from '../../shared/ledFixtures'
import { METERS_PER_FOOT, StageDimensions } from '../../shared/stage'
import type { MoverPreviewFixture } from './lightingPreviewTypes'

export interface LightingPreviewFixtureRow {
  fixtureIndex: number
  fixture: Fixture
  fixtureType: FixtureType
  fixtureId: string
  fixtureName: string
  fixtureLabel: string
  groupName: string
  groups: string[]
  moverMountOrientation: MoverMountOrientation
  isMover: boolean
}

type LogicalFixtureChannel = {
  channel: LeafFixtureChannel
  min: number
  max: number
}

function expandLogicalChannels(channel: FixtureType['channels'][number]): LogicalFixtureChannel[] {
  if (channel.type !== 'split') {
    return [{ channel, min: 0, max: 255 }]
  }

  return channel.ranges.map((range) => ({
    channel: range.channel,
    min: Math.min(range.min, range.max),
    max: Math.max(range.min, range.max),
  }))
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return undefined
}

function normalizeFixtureId(fixture: Fixture, index: number): string {
  if (typeof fixture.id === 'string' && fixture.id.trim().length > 0) {
    return fixture.id
  }

  return `legacy-${index}-${fixture.type}-${fixture.universe}-${fixture.ch}`
}

function getGroupName(
  dmx: DmxState,
  fixture: Fixture,
  fixtureType: FixtureType,
  fixtureId: string
): string {
  return (
    firstNonEmpty([
      dmx.moverGroupByFixtureId[fixtureId],
      fixture.groups[0],
      fixtureType.name,
    ]) ?? 'Fixture Group'
  )
}

function previewEmitterChannelIndexes(
  fixtureType: FixtureType,
  emitter: {
    channelIndexes: number[]
    subFixtureIndex?: number
  }
): number[] {
  if (fixtureType.subFixtures.length === 0) {
    return [...emitter.channelIndexes]
  }
  const subIndex = resolveEmitterSubFixtureIndex(
    fixtureType,
    emitter as Parameters<typeof resolveEmitterSubFixtureIndex>[1]
  )
  if (subIndex === null) {
    return [...emitter.channelIndexes]
  }
  const sub = fixtureType.subFixtures[subIndex]
  if (sub === undefined) {
    return [...emitter.channelIndexes]
  }
  const allowed = new Set(sub.channels)
  const filtered = emitter.channelIndexes.filter((channelIndex) =>
    allowed.has(channelIndex)
  )
  if (filtered.length > 0) {
    return filtered
  }
  // If the emitter is assigned to a subfixture but has no explicit channels,
  // preview the full subfixture bundle so sequence follows subfixture mapping.
  return [...sub.channels]
}

function getFixtureGroups(fixture: Fixture, fixtureType: FixtureType): string[] {
  const set = new Set<string>()
  for (const group of fixture.groups) {
    const trimmed = group.trim()
    if (trimmed.length > 0) set.add(trimmed)
  }
  for (const sub of fixtureType.subFixtures) {
    for (const group of sub.groups) {
      const trimmed = group.trim()
      if (trimmed.length > 0) set.add(trimmed)
    }
  }
  return Array.from(set)
}

export function buildLightingPreviewRows(
  dmx: DmxState
): LightingPreviewFixtureRow[] {
  const rows: LightingPreviewFixtureRow[] = []

  dmx.universe.forEach((fixture, index) => {
    const fixtureType = dmx.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) {
      return
    }

    const fixtureId = normalizeFixtureId(fixture, index)
    const groupName = getGroupName(dmx, fixture, fixtureType, fixtureId)
    const groups = getFixtureGroups(fixture, fixtureType)

    const fixtureName =
      typeof fixture.name === 'string' && fixture.name.trim().length > 0
        ? fixture.name.trim()
        : fixtureType.name

    rows.push({
      fixtureIndex: index,
      fixture,
      fixtureType,
      fixtureId,
      fixtureName,
      groupName,
      groups,
      fixtureLabel: `U${fixture.universe}:${fixture.ch} ${fixtureName}`,
      moverMountOrientation:
        fixture.moverMountOrientation === 'inverted' ? 'inverted' : 'upright',
      isMover: isMoverFixtureType(fixtureType),
    })
  })

  return rows
}

export function buildMoverPreviewRows(
  dmx: DmxState
): LightingPreviewFixtureRow[] {
  return buildLightingPreviewRows(dmx).filter((row) => row.isMover)
}

export function mapRowsToPreviewFixtures(
  rows: LightingPreviewFixtureRow[],
  options?: { fxtrDepthOn?: boolean }
): MoverPreviewFixture[] {
  const depthEnabled = options?.fxtrDepthOn !== false
  return rows.map((row) => {
    let panCoarseChannel: number | undefined
    let panFineChannel: number | undefined
    let tiltCoarseChannel: number | undefined
    let tiltFineChannel: number | undefined
    let panMin: number | undefined
    let panMax: number | undefined
    let tiltMin: number | undefined
    let tiltMax: number | undefined

    const colorChannels: MoverPreviewFixture['colorChannels'] = []
    const colorMapChannels: MoverPreviewFixture['colorMapChannels'] = []
    const masterChannels: MoverPreviewFixture['masterChannels'] = []
    const effectChannels: MoverPreviewFixture['effectChannels'] = []
    const focusChannels: MoverPreviewFixture['focusChannels'] = []
    const goboMapChannels: MoverPreviewFixture['goboMapChannels'] = []

    row.fixtureType.channels.forEach((channel, channelIndex) => {
      const absoluteChannel = row.fixture.ch + channelIndex - 1

      for (const logicalChannel of expandLogicalChannels(channel)) {
        const leaf = logicalChannel.channel
        if (leaf.type === 'color') {
          colorChannels.push({
            channelIndex: absoluteChannel,
            color: leaf.color,
          })
        } else if (leaf.type === 'colorMap') {
          colorMapChannels.push({
            channelIndex: absoluteChannel,
            colors: leaf.colors,
          })
        } else if (leaf.type === 'master') {
          masterChannels.push({
            channelIndex: absoluteChannel,
            min: clampToRange(leaf.min, logicalChannel.min, logicalChannel.max),
            max: clampToRange(leaf.max, logicalChannel.min, logicalChannel.max),
            isOnOff: leaf.isOnOff,
          })
        } else if (leaf.type === 'fxtrTrigger') {
          effectChannels.push({
            channelIndex: absoluteChannel,
            min: clampToRange(leaf.off, logicalChannel.min, logicalChannel.max),
            max: clampToRange(leaf.on, logicalChannel.min, logicalChannel.max),
            isOnOff: true,
          })
        } else if (leaf.type === 'fxtrLevel') {
          effectChannels.push({
            channelIndex: absoluteChannel,
            min: clampToRange(leaf.min, logicalChannel.min, logicalChannel.max),
            max: clampToRange(leaf.max, logicalChannel.min, logicalChannel.max),
            isOnOff: false,
          })
        } else if (
          leaf.type === 'custom' &&
          leaf.name.trim().toLowerCase().includes('focus')
        ) {
          focusChannels.push({
            channelIndex: absoluteChannel,
            min: clampToRange(leaf.min, logicalChannel.min, logicalChannel.max),
            max: clampToRange(leaf.max, logicalChannel.min, logicalChannel.max),
          })
        } else if (leaf.type === 'goboMap') {
          goboMapChannels.push({
            channelIndex: absoluteChannel,
            gobos: leaf.gobos.map((gobo) => ({
              name: gobo.name,
              max: clampToRange(
                gobo.max,
                logicalChannel.min,
                logicalChannel.max
              ),
            })),
          })
        }

        if (leaf.type !== 'axis') {
          continue
        }

        if (leaf.dir === 'x') {
          if (leaf.isFine) {
            panFineChannel = absoluteChannel
          } else {
            panCoarseChannel = absoluteChannel
            panMin = clampToRange(
              leaf.min,
              logicalChannel.min,
              logicalChannel.max
            )
            panMax = clampToRange(
              leaf.max,
              logicalChannel.min,
              logicalChannel.max
            )
          }
        } else if (leaf.isFine) {
          tiltFineChannel = absoluteChannel
        } else {
          tiltCoarseChannel = absoluteChannel
          tiltMin = clampToRange(
            leaf.min,
            logicalChannel.min,
            logicalChannel.max
          )
          tiltMax = clampToRange(
            leaf.max,
            logicalChannel.min,
            logicalChannel.max
          )
        }
      }
    })

    const model = normalizeFixtureModelConfig(row.fixtureType.model, row.fixtureType)
    const resolvedCustomEmitters =
      model.useCustomEmitterLayout && model.customEmitters.length > 0
        ? model.customEmitters
        : buildAutoFittedDefaultCustomEmitters(row.fixtureType, model)

    const emitterGroups: MoverPreviewFixture['emitterGroups'] = []
    if (row.fixtureType.subFixtures.length > 0) {
      const fallbackDenominator = Math.max(1, row.fixtureType.subFixtures.length - 1)
      row.fixtureType.subFixtures.forEach((subFixture, subFixtureIndex) => {
        const subColorChannels: MoverPreviewFixture['colorChannels'] = []
        const subColorMapChannels: MoverPreviewFixture['colorMapChannels'] = []
        const subMasterChannels: MoverPreviewFixture['masterChannels'] = []
        const subEffectChannels: MoverPreviewFixture['effectChannels'] = []
        const subGoboMapChannels: MoverPreviewFixture['goboMapChannels'] = []

        subFixture.channels.forEach((fixtureTypeChannelIndex) => {
          const channel = row.fixtureType.channels[fixtureTypeChannelIndex]
          if (channel === undefined) {
            return
          }

          const absoluteChannel = row.fixture.ch + fixtureTypeChannelIndex - 1
          for (const logicalChannel of expandLogicalChannels(channel)) {
            const leaf = logicalChannel.channel
            if (leaf.type === 'color') {
              subColorChannels.push({
                channelIndex: absoluteChannel,
                color: leaf.color,
              })
            } else if (leaf.type === 'colorMap') {
              subColorMapChannels.push({
                channelIndex: absoluteChannel,
                colors: leaf.colors,
              })
            } else if (leaf.type === 'master') {
              subMasterChannels.push({
                channelIndex: absoluteChannel,
                min: clampToRange(leaf.min, logicalChannel.min, logicalChannel.max),
                max: clampToRange(leaf.max, logicalChannel.min, logicalChannel.max),
                isOnOff: leaf.isOnOff,
              })
            } else if (leaf.type === 'fxtrTrigger') {
              subEffectChannels.push({
                channelIndex: absoluteChannel,
                min: clampToRange(leaf.off, logicalChannel.min, logicalChannel.max),
                max: clampToRange(leaf.on, logicalChannel.min, logicalChannel.max),
                isOnOff: true,
              })
            } else if (leaf.type === 'fxtrLevel') {
              subEffectChannels.push({
                channelIndex: absoluteChannel,
                min: clampToRange(leaf.min, logicalChannel.min, logicalChannel.max),
                max: clampToRange(leaf.max, logicalChannel.min, logicalChannel.max),
                isOnOff: false,
              })
            } else if (leaf.type === 'goboMap') {
              subGoboMapChannels.push({
                channelIndex: absoluteChannel,
                gobos: leaf.gobos.map((gobo) => ({
                  name: gobo.name,
                  max: clampToRange(
                    gobo.max,
                    logicalChannel.min,
                    logicalChannel.max
                  ),
                })),
              })
            }
          }
        })

        const subEmitters = emittersForSubfixtureIndex(
          row.fixtureType,
          resolvedCustomEmitters,
          subFixtureIndex
        )
        const centroid = computeEmitterCentroid(subEmitters)
        const effectiveRelative =
          centroid !== null
            ? mergeSubRelativeWindowWithEmitterCentroid(
                subFixture.relative_window,
                centroid,
                row.fixture.window
              )
            : subFixture.relative_window

        emitterGroups.push({
          emitterCount: model.emittersPerSubFixture,
          relativeX:
            effectiveRelative?.x?.pos ??
            (row.fixtureType.subFixtures.length <= 1
              ? 0.5
              : subFixtureIndex / fallbackDenominator),
          relativeY: effectiveRelative?.y?.pos ?? 0.5,
          relativeZ: depthEnabled
            ? effectiveRelative?.z?.pos ?? 1
            : 1,
          colorChannels: subColorChannels,
          colorMapChannels: subColorMapChannels,
          masterChannels: subMasterChannels,
          effectChannels: subEffectChannels,
          goboMapChannels: subGoboMapChannels,
        })
      })
    } else {
      emitterGroups.push({
        emitterCount: model.emittersPerSubFixture,
        relativeX: 0.5,
        relativeY: 0.5,
        relativeZ: 1,
        colorChannels,
        colorMapChannels,
        masterChannels,
        effectChannels,
        goboMapChannels,
      })
    }

    const fixtureRotation = row.fixture.rotation

    return {
      fixtureId: row.fixtureId,
      fixtureIndex: row.fixtureIndex,
      ledFixtureIndex: undefined,
      fixtureName: row.fixtureName,
      fixtureLabel: row.fixtureLabel,
      isMover: row.isMover,
      isLedFixture: false,
      groups: row.groups,
      groupName: `${row.groupName} (${row.moverMountOrientation === 'inverted' ? 'Hung' : 'Upright'})`,
      xPos: row.fixture.window?.x?.pos ?? 0.5,
      yPos: row.fixture.window?.y?.pos ?? 0.5,
      zPos: depthEnabled ? row.fixture.window?.z?.pos ?? 1 : 1,
      rotation: {
        x: Number.isFinite(fixtureRotation?.x) ? Number(fixtureRotation?.x) : 0,
        y: Number.isFinite(fixtureRotation?.y) ? Number(fixtureRotation?.y) : 0,
        z: Number.isFinite(fixtureRotation?.z) ? Number(fixtureRotation?.z) : 0,
      },
      universe: row.fixture.universe ?? 1,
      channelBase: row.fixture.ch,
      panCoarseChannel,
      panFineChannel,
      tiltCoarseChannel,
      tiltFineChannel,
      panMin,
      panMax,
      tiltMin,
      tiltMax,
      moverCalibration: row.fixtureType.moverCalibration,
      moverBounds: row.fixture.moverBounds,
      moverMountOrientation: row.moverMountOrientation,
      colorChannels,
      colorMapChannels,
      masterChannels,
      effectChannels,
      focusChannels,
      goboMapChannels,
      model,
      emitterGroups,
      customEmitters: resolvedCustomEmitters.map((emitter) => ({
        id: emitter.id,
        x: emitter.x,
        y: emitter.y,
        z: emitter.z,
        size: emitter.size,
        shape: emitter.shape,
        ...(emitter.rectWidthM !== undefined && emitter.rectHeightM !== undefined
          ? {
              rectWidthM: emitter.rectWidthM,
              rectHeightM: emitter.rectHeightM,
            }
          : {}),
        channelIndexes: previewEmitterChannelIndexes(row.fixtureType, emitter),
      })),
      ledPixels: undefined,
      ledWireEdges: undefined,
      ledFixture: undefined,
    }
  })
}

export function buildLedPreviewFixtures(dmx: DmxState): MoverPreviewFixture[] {
  const previewFixtures: MoverPreviewFixture[] = []
  const stage = dmx.stage
  dmx.led.ledFixtures.forEach((rawFixture, ledFixtureIndex) => {
    const fixture = normalizeLedFixtureForRuntime(rawFixture)
    const layout = buildLedLocalLayout(fixture, stage)
    if (layout.pixels.length === 0) {
      return
    }

    const fixtureName =
      typeof fixture.name === 'string' && fixture.name.trim().length > 0
        ? fixture.name.trim()
        : `LED ${ledFixtureIndex + 1}`
    const groupName = firstNonEmpty([fixture.groups[0]]) ?? 'LED'

    const layoutWidth = layout.width
    const model = initFixtureModelConfig()
    model.kind = 'parCan'
    model.emittersPerSubFixture = Math.max(1, Math.min(64, layout.pixels.length))
    model.width = Math.max(0.2, Math.min(8, layoutWidth))

    previewFixtures.push({
      fixtureId: `led:${fixture.id}`,
      fixtureIndex: -1,
      ledFixtureIndex,
      fixtureName,
      fixtureLabel: `LED ${fixtureName}`,
      isMover: false,
      isLedFixture: true,
      groups: fixture.groups,
      groupName,
      xPos: fixture.position.x,
      yPos: fixture.position.y,
      zPos: fixture.position.z,
      rotation: {
        x: fixture.rotation.x,
        y: fixture.rotation.y,
        z: fixture.rotation.z,
      },
      universe: 1,
      channelBase: 1,
      colorChannels: [],
      colorMapChannels: [],
      masterChannels: [],
      effectChannels: [],
      focusChannels: [],
      goboMapChannels: [],
      model,
      emitterGroups: [
        {
          emitterCount: layout.pixels.length,
          relativeX: 0.5,
          relativeY: 0.5,
          relativeZ: 0.5,
          colorChannels: [],
          colorMapChannels: [],
          masterChannels: [],
          effectChannels: [],
          goboMapChannels: [],
        },
      ],
      customEmitters: [],
      ledPixels: layout.pixels,
      ledWireEdges: layout.edges,
      ledFixture: fixture,
    })
  })

  return previewFixtures
}

function buildLedLocalLayout(
  fixture: LedFixture,
  stage: StageDimensions
): {
  pixels: Array<{ x: number; y: number; z: number }>
  edges: Array<[number, number]>
  width: number
} {
  const points = getLedPointLayout3D(fixture)
  if (points.length === 0) {
    return { pixels: [], edges: [], width: 0.2 }
  }

  const centroid = points
    .reduce(
      (acc, point) => {
        acc.x += point.x
        acc.y += point.y
        acc.z += point.z
        return acc
      },
      { x: 0, y: 0, z: 0 }
    )
  centroid.x /= points.length
  centroid.y /= points.length
  centroid.z /= points.length

  const stageWidthWorld = Math.max(0.25, Number(stage.widthFt) * METERS_PER_FOOT)
  const stageHeightWorld = Math.max(0.25, Number(stage.heightFt) * METERS_PER_FOOT)
  const stageDepthWorld = Math.max(0.25, Number(stage.depthFt) * METERS_PER_FOOT)

  const pixels = points.map((point) => ({
    x: (point.x - centroid.x) * stageWidthWorld,
    y: (point.y - centroid.y) * stageHeightWorld,
    z: (point.z - centroid.z) * stageDepthWorld,
  }))
  const edges: Array<[number, number]> =
    fixture.kind === 'grid'
      ? buildGridEdgesFromFixture(fixture, points.length)
      : buildStringEdges(points.length)

  const bounds = computeBounds(points)
  const width = Math.max(
    0.2,
    Math.max(
      (bounds.maxX - bounds.minX) * stageWidthWorld,
      (bounds.maxY - bounds.minY) * stageHeightWorld,
      (bounds.maxZ - bounds.minZ) * stageDepthWorld
    )
  )
  return { pixels, edges, width }
}

function computeBounds(points: Array<{ x: number; y: number; z: number }>) {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  }
  return {
    minX: Number.isFinite(minX) ? minX : 0.5,
    maxX: Number.isFinite(maxX) ? maxX : 0.5,
    minY: Number.isFinite(minY) ? minY : 0.5,
    maxY: Number.isFinite(maxY) ? maxY : 0.5,
    minZ: Number.isFinite(minZ) ? minZ : 0.5,
    maxZ: Number.isFinite(maxZ) ? maxZ : 0.5,
  }
}

function buildStringEdges(pointCount: number): Array<[number, number]> {
  const edges: Array<[number, number]> = []
  for (let i = 0; i < pointCount - 1; i++) {
    edges.push([i, i + 1])
  }
  return edges
}

function buildGridEdgesFromFixture(
  fixture: Extract<LedFixture, { kind: 'grid' }>,
  pointCount: number
): Array<[number, number]> {
  const rows = Math.max(1, fixture.rows)
  const columns = Math.max(1, fixture.columns)
  const serpentine = fixture.serpentine
  const edges: Array<[number, number]> = []

  const indexForCell = (row: number, column: number) => {
    if (serpentine && row % 2 === 1) {
      return row * columns + (columns - 1 - column)
    }
    return row * columns + column
  }
  const hasIndex = (index: number) => index >= 0 && index < pointCount

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const current = indexForCell(row, column)
      if (!hasIndex(current)) continue

      if (column + 1 < columns) {
        const right = indexForCell(row, column + 1)
        if (hasIndex(right)) {
          edges.push([current, right])
        }
      }

      if (row + 1 < rows) {
        const below = indexForCell(row + 1, column)
        if (hasIndex(below)) {
          edges.push([current, below])
        }
      }
    }
  }

  return edges
}

