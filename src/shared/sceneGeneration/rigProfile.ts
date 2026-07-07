import {
  Fixture,
  FixtureType,
  fixtureChannelLeafChannels,
  isMoverFixtureType,
} from '../dmxFixtures'
import { isMappedAtmosphericFixture } from '../atmosphericsMapping'

export interface FixtureAnchor {
  x: number
  y: number
  groups: string[]
  universe: number
  isMover: boolean
  isAtmos: boolean
}

export interface SpatialZone {
  x: number
  y: number
  width: number
  height: number
  groupName?: string
}

export interface RigProfile {
  fixtureCount: number
  hasMovers: boolean
  hasAtmos: boolean
  hasStrobe: boolean
  hasGobo: boolean
  hasPrism: boolean
  hasColorMap: boolean
  usableGroups: string[]
  fixtureAnchors: FixtureAnchor[]
  placementBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  universes: number[]
}

export interface SceneGenerationRigInput {
  universe: Fixture[]
  fixtureTypesByID: Record<string, FixtureType>
}

const RESERVED_GROUPS = new Set(['Movers', 'Atmosphere', 'Visualizer', 'All'])

function axisPos(windowAxis: { pos?: number } | undefined, fallback: number) {
  const pos = windowAxis?.pos
  return Number.isFinite(pos) ? Math.min(1, Math.max(0, Number(pos))) : fallback
}

function fixtureHasChannelType(
  fixtureType: FixtureType,
  types: Set<string>
): boolean {
  return fixtureType.channels
    .flatMap((channel) => fixtureChannelLeafChannels(channel))
    .some((channel) => types.has(channel.type))
}

export function analyzeRigProfile(input: SceneGenerationRigInput): RigProfile {
  const anchors: FixtureAnchor[] = []
  const groupCounts = new Map<string, number>()
  const universes = new Set<number>()

  let hasMovers = false
  let hasAtmos = false
  let hasStrobe = false
  let hasGobo = false
  let hasPrism = false
  let hasColorMap = false

  for (const fixture of input.universe) {
    const fixtureType = input.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) {
      continue
    }

    const universe = fixture.universe ?? 1
    universes.add(universe)

    const mover = isMoverFixtureType(fixtureType)
    const atmos = isMappedAtmosphericFixture(fixture, fixtureType)
    hasMovers = hasMovers || mover
    hasAtmos = hasAtmos || atmos
    hasStrobe =
      hasStrobe ||
      fixtureHasChannelType(fixtureType, new Set(['strobe', 'strobeRgb']))
    hasGobo = hasGobo || fixtureHasChannelType(fixtureType, new Set(['goboMap']))
    hasPrism =
      hasPrism || fixtureHasChannelType(fixtureType, new Set(['prismMap']))
    hasColorMap =
      hasColorMap || fixtureHasChannelType(fixtureType, new Set(['colorMap']))

    const groups = Array.isArray(fixture.groups) ? fixture.groups : []
    for (const group of groups) {
      const normalized = group.trim()
      if (normalized.length <= 0 || RESERVED_GROUPS.has(normalized)) {
        continue
      }
      groupCounts.set(normalized, (groupCounts.get(normalized) ?? 0) + 1)
    }

    anchors.push({
      x: axisPos(fixture.window?.x, 0.5),
      y: axisPos(fixture.window?.y, 0.5),
      groups,
      universe,
      isMover: mover,
      isAtmos: atmos,
    })
  }

  const usableGroups = [...groupCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([group]) => group)

  const bounds = computePlacementBounds(anchors)

  return {
    fixtureCount: anchors.length,
    hasMovers,
    hasAtmos,
    hasStrobe,
    hasGobo,
    hasPrism,
    hasColorMap,
    usableGroups,
    fixtureAnchors: anchors,
    placementBounds: bounds,
    universes: [...universes].sort((a, b) => a - b),
  }
}

function computePlacementBounds(anchors: FixtureAnchor[]) {
  if (anchors.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (const anchor of anchors) {
    minX = Math.min(minX, anchor.x)
    maxX = Math.max(maxX, anchor.x)
    minY = Math.min(minY, anchor.y)
    maxY = Math.max(maxY, anchor.y)
  }
  const padX = Math.max(0.08, (maxX - minX) * 0.12)
  const padY = Math.max(0.08, (maxY - minY) * 0.12)
  return {
    minX: Math.max(0, minX - padX),
    maxX: Math.min(1, maxX + padX),
    minY: Math.max(0, minY - padY),
    maxY: Math.min(1, maxY + padY),
  }
}

export function defaultStageZones(cols: number, rows: number): SpatialZone[] {
  const zones: SpatialZone[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      zones.push({
        x: (col + 0.5) / cols,
        y: 1 - (row + 0.5) / rows,
        width: 0.9 / cols,
        height: 0.9 / rows,
      })
    }
  }
  return zones
}

export function buildSpatialZonesFromRig(
  profile: RigProfile,
  cols: number,
  rows: number
): SpatialZone[] {
  if (profile.fixtureCount === 0) {
    return defaultStageZones(cols, rows)
  }

  const { minX, maxX, minY, maxY } = profile.placementBounds
  const spanX = Math.max(0.12, maxX - minX)
  const spanY = Math.max(0.12, maxY - minY)
  const cellW = spanX / cols
  const cellH = spanY / rows
  const zones: SpatialZone[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      zones.push({
        x: minX + (col + 0.5) * cellW,
        y: minY + (rows - row - 0.5) * cellH,
        width: Math.min(1, cellW * 0.92),
        height: Math.min(1, cellH * 0.92),
      })
    }
  }
  return zones
}

export function buildLeftRightZones(profile: RigProfile): [SpatialZone, SpatialZone] {
  const { minX, maxX, minY, maxY } = profile.placementBounds
  const midX = (minX + maxX) * 0.5
  const y = (minY + maxY) * 0.5
  const width = Math.max(0.28, (maxX - minX) * 0.42)
  const height = Math.max(0.55, maxY - minY)
  return [
    { x: midX - width * 0.55, y, width, height },
    { x: midX + width * 0.55, y, width, height },
  ]
}

export function buildGroupZones(profile: RigProfile, count: number): SpatialZone[] {
  const groups = profile.usableGroups.slice(0, count)
  if (groups.length >= count) {
    return groups.map((groupName, index) => {
      const hueOffset = index / Math.max(1, count)
      const x = 0.2 + hueOffset * 0.6
      return {
        x,
        y: 0.5,
        width: 0.38,
        height: 0.85,
        groupName,
      }
    })
  }
  return buildSpatialZonesFromRig(profile, count, 1)
}

/** Generic rig profile for shipping default-save light scenes (movers + strobe enabled). */
export function defaultSaveRigProfile(): RigProfile {
  return {
    fixtureCount: 16,
    hasMovers: true,
    hasAtmos: false,
    hasStrobe: true,
    hasGobo: false,
    hasPrism: false,
    hasColorMap: false,
    usableGroups: [],
    fixtureAnchors: [],
    placementBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
    universes: [1],
  }
}
