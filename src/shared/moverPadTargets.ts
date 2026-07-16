import { clampNormalized } from '../math/util'
import { getParam, Params } from './params'

export const MOVER_TANDEM_MAX_SPREAD = 0.65

export type MoverPadPlacementEntry = {
  key: string
  x: number
  y: number
  sortOrder?: number
}

export type MoverPadTarget = {
  key: string
  x: number
  y: number
  mirrored: boolean
}

export function mirrorAroundCenter(value: number, center: number): number {
  return center * 2 - value
}

export function parseMoverModeFromParams(params: Params): number {
  const raw = Number(params.moverMode ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(2, Math.round(raw)))
}

export function resolveMoverPadTargetsForGroup(
  fixtures: ReadonlyArray<MoverPadPlacementEntry>,
  options: {
    baseX: number
    baseY: number
    moverMode: number
    spread: number
    mirrorLeftRight: boolean
    mirrorTopBottom: boolean
    hasPanTarget?: boolean
    hasTiltTarget?: boolean
  }
): MoverPadTarget[] {
  if (fixtures.length === 0) {
    return []
  }

  const hasPanTarget = options.hasPanTarget !== false
  const hasTiltTarget = options.hasTiltTarget !== false
  const baseX = clampNormalized(options.baseX)
  const baseY = clampNormalized(options.baseY)
  const moverMode = Math.max(0, Math.min(2, Math.round(options.moverMode)))
  const spread = Math.min(
    MOVER_TANDEM_MAX_SPREAD,
    clampNormalized(options.spread)
  )
  const mirrorLeftRight = options.mirrorLeftRight
  const mirrorTopBottom = options.mirrorTopBottom

  const orderedFixtures = [...fixtures].sort((left, right) => {
    if (left.x !== right.x) return left.x - right.x
    if (left.y !== right.y) return left.y - right.y
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
  })

  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0

  for (const entry of orderedFixtures) {
    minX = Math.min(minX, entry.x)
    maxX = Math.max(maxX, entry.x)
    minY = Math.min(minY, entry.y)
    maxY = Math.max(maxY, entry.y)
  }

  const spanX = maxX - minX
  const spanY = maxY - minY
  const hasHorizontalSpread = spanX > 0.0001
  const hasVerticalSpread = spanY > 0.0001
  const sideEpsilon = 0.0001
  const centerX = (minX + maxX) * 0.5
  const centerY = (minY + maxY) * 0.5

  const isRightFlags = orderedFixtures.map((entry, entryIndex) =>
    hasHorizontalSpread
      ? entry.x > centerX + sideEpsilon
      : entryIndex >= Math.ceil(orderedFixtures.length / 2)
  )
  const isBottomFlags = orderedFixtures.map((entry, entryIndex) =>
    hasVerticalSpread
      ? entry.y < centerY - sideEpsilon
      : entryIndex >= Math.ceil(orderedFixtures.length / 2)
  )

  return orderedFixtures.map((entry, entryIndex) => {
    const relX = hasHorizontalSpread
      ? clampNormalized((entry.x - minX) / spanX)
      : orderedFixtures.length <= 1
        ? 0.5
        : entryIndex / (orderedFixtures.length - 1)

    const isRight = isRightFlags[entryIndex] === true
    const isBottom = isBottomFlags[entryIndex] === true

    let fixtureX = hasPanTarget ? baseX : 0.5
    let fixtureY = hasTiltTarget ? baseY : 0.5
    let mirrored = false

    if (moverMode === 1 && hasPanTarget) {
      fixtureX = baseX + (relX - 0.5) * spread
    }

    const applyGroupMirrorX = hasPanTarget && moverMode === 2 && mirrorLeftRight
    const applyGroupMirrorY = hasTiltTarget && moverMode === 2 && mirrorTopBottom

    if (applyGroupMirrorX && isRight) {
      fixtureX = mirrorAroundCenter(fixtureX, 0.5)
      mirrored = true
    }
    if (applyGroupMirrorY && isBottom) {
      fixtureY = mirrorAroundCenter(fixtureY, 0.5)
      mirrored = true
    }

    return {
      key: entry.key,
      x: clampNormalized(hasPanTarget ? fixtureX : baseX),
      y: clampNormalized(hasTiltTarget ? fixtureY : baseY),
      mirrored,
    }
  })
}

export function resolveMoverPadTargetsFromParams(
  fixturesByGroup: Readonly<Record<string, ReadonlyArray<MoverPadPlacementEntry>>>,
  params: Params
): MoverPadTarget[] {
  const baseX = clampNormalized(Number(params.xAxis ?? 0.5))
  const baseY = clampNormalized(Number(params.yAxis ?? 0.5))
  const moverMode = parseMoverModeFromParams(params)
  const spread = clampNormalized(getParam(params, 'moverSpread'))
  const mirrorLeftRight = getParam(params, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(params, 'moverMirrorY') > 0.5

  const targets: MoverPadTarget[] = []
  for (const fixtures of Object.values(fixturesByGroup)) {
    targets.push(
      ...resolveMoverPadTargetsForGroup(fixtures, {
        baseX,
        baseY,
        moverMode,
        spread,
        mirrorLeftRight,
        mirrorTopBottom,
      })
    )
  }
  return targets
}
