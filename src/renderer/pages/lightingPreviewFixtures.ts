import type { DmxState } from '../redux/dmxSlice'
import {
  Fixture,
  FixtureType,
  MoverMountOrientation,
  isMoverFixtureType,
  normalizeFixtureModelConfig,
} from '../../shared/dmxFixtures'
import type { MoverPreviewFixture } from './Lighting3D'

export interface LightingPreviewFixtureRow {
  fixture: Fixture
  fixtureType: FixtureType
  fixtureId: string
  fixtureLabel: string
  groupName: string
  moverMountOrientation: MoverMountOrientation
  isMover: boolean
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
      fixtureType.groups[0],
      fixtureType.name,
    ]) ?? 'Fixture Group'
  )
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

    rows.push({
      fixture,
      fixtureType,
      fixtureId,
      groupName,
      fixtureLabel: `U${fixture.universe}:${fixture.ch} ${fixtureType.name}`,
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
  rows: LightingPreviewFixtureRow[]
): MoverPreviewFixture[] {
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
    const focusChannels: MoverPreviewFixture['focusChannels'] = []
    const goboMapChannels: MoverPreviewFixture['goboMapChannels'] = []

    row.fixtureType.channels.forEach((channel, channelIndex) => {
      const absoluteChannel = row.fixture.ch + channelIndex - 1

      if (channel.type === 'color') {
        colorChannels.push({
          channelIndex: absoluteChannel,
          color: channel.color,
        })
      } else if (channel.type === 'colorMap') {
        colorMapChannels.push({
          channelIndex: absoluteChannel,
          colors: channel.colors,
        })
      } else if (channel.type === 'master') {
        masterChannels.push({
          channelIndex: absoluteChannel,
          min: channel.min,
          max: channel.max,
          isOnOff: channel.isOnOff,
        })
      } else if (
        channel.type === 'custom' &&
        channel.name.trim().toLowerCase().includes('focus')
      ) {
        focusChannels.push({
          channelIndex: absoluteChannel,
          min: channel.min,
          max: channel.max,
        })
      } else if (channel.type === 'goboMap') {
        goboMapChannels.push({
          channelIndex: absoluteChannel,
          gobos: channel.gobos.map((gobo) => ({
            name: gobo.name,
            max: gobo.max,
          })),
        })
      }

      if (channel.type !== 'axis') {
        return
      }

      if (channel.dir === 'x') {
        if (channel.isFine) {
          panFineChannel = absoluteChannel
        } else {
          panCoarseChannel = absoluteChannel
          panMin = channel.min
          panMax = channel.max
        }
      } else if (channel.isFine) {
        tiltFineChannel = absoluteChannel
      } else {
        tiltCoarseChannel = absoluteChannel
        tiltMin = channel.min
        tiltMax = channel.max
      }
    })

    const model = normalizeFixtureModelConfig(row.fixtureType.model, row.fixtureType)

    const emitterGroups: MoverPreviewFixture['emitterGroups'] = []
    if (row.fixtureType.subFixtures.length > 0) {
      const fallbackDenominator = Math.max(1, row.fixtureType.subFixtures.length - 1)
      row.fixtureType.subFixtures.forEach((subFixture, subFixtureIndex) => {
        const subColorChannels: MoverPreviewFixture['colorChannels'] = []
        const subColorMapChannels: MoverPreviewFixture['colorMapChannels'] = []
        const subMasterChannels: MoverPreviewFixture['masterChannels'] = []
        const subGoboMapChannels: MoverPreviewFixture['goboMapChannels'] = []

        subFixture.channels.forEach((fixtureTypeChannelIndex) => {
          const channel = row.fixtureType.channels[fixtureTypeChannelIndex]
          if (channel === undefined) {
            return
          }

          const absoluteChannel = row.fixture.ch + fixtureTypeChannelIndex - 1
          if (channel.type === 'color') {
            subColorChannels.push({
              channelIndex: absoluteChannel,
              color: channel.color,
            })
          } else if (channel.type === 'colorMap') {
            subColorMapChannels.push({
              channelIndex: absoluteChannel,
              colors: channel.colors,
            })
          } else if (channel.type === 'master') {
            subMasterChannels.push({
              channelIndex: absoluteChannel,
              min: channel.min,
              max: channel.max,
              isOnOff: channel.isOnOff,
            })
          } else if (channel.type === 'goboMap') {
            subGoboMapChannels.push({
              channelIndex: absoluteChannel,
              gobos: channel.gobos.map((gobo) => ({
                name: gobo.name,
                max: gobo.max,
              })),
            })
          }
        })

        emitterGroups.push({
          emitterCount: model.emittersPerSubFixture,
          relativeX:
            subFixture.relative_window?.x?.pos ??
            (row.fixtureType.subFixtures.length <= 1
              ? 0.5
              : subFixtureIndex / fallbackDenominator),
          relativeY: subFixture.relative_window?.y?.pos ?? 0.5,
          relativeZ: subFixture.relative_window?.z?.pos ?? 0.5,
          colorChannels: subColorChannels,
          colorMapChannels: subColorMapChannels,
          masterChannels: subMasterChannels,
          goboMapChannels: subGoboMapChannels,
        })
      })
    } else {
      emitterGroups.push({
        emitterCount: model.emittersPerSubFixture,
        relativeX: 0.5,
        relativeY: 0.5,
        relativeZ: 0.5,
        colorChannels,
        colorMapChannels,
        masterChannels,
        goboMapChannels,
      })
    }

    const fixtureRotation = row.fixture.rotation

    return {
      fixtureId: row.fixtureId,
      groupName: row.groupName,
      xPos: row.fixture.window?.x?.pos ?? 0.5,
      yPos: row.fixture.window?.y?.pos ?? 0.5,
      zPos: row.fixture.window?.z?.pos ?? 1,
      rotation: {
        x: Number.isFinite(fixtureRotation?.x) ? Number(fixtureRotation?.x) : 0,
        y: Number.isFinite(fixtureRotation?.y) ? Number(fixtureRotation?.y) : 0,
        z: Number.isFinite(fixtureRotation?.z) ? Number(fixtureRotation?.z) : 0,
      },
      universe: row.fixture.universe ?? 1,
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
      focusChannels,
      goboMapChannels,
      model,
      emitterGroups,
    }
  })
}

