import type { SplitScene_t } from '../../shared/Scenes'

/**
 * Split index that owns the Visualizer group, or -1.
 * Never fall back to 0: split 0 is often "all" and must not be treated as the visualizer-only split
 * (avoids an update loop in ParamsControl when the real visualizer split is removed).
 */
export function visSplitIdx(
  splitScenes: readonly { groups?: Record<string, boolean | undefined> }[]
): number {
  for (let i = 0; i < splitScenes.length; i++) {
    if (splitScenes[i]?.groups?.Visualizer === true) {
      return i
    }
  }
  return -1
}

/** Hide Visualizer-only splits from lighting UI when the detached window is off. */
export function hideVisSplitUi(
  videoEnabled: boolean,
  groups: SplitScene_t['groups'] | undefined
): boolean {
  if (videoEnabled) return false
  return isDedicatedGroupSplit(groups, 'Visualizer')
}

/** Show Visualizer group in pickers only while detached visualizer is active. */
export function showVisGroupUi(videoEnabled: boolean): boolean {
  return videoEnabled === true
}

/** Hide laser fixture-group splits when the detached Laser window is closed. */
export function hideLaserSplitUi(
  laserWindowOpen: boolean,
  groups: SplitScene_t['groups'] | undefined,
  laserGroupNames: ReadonlySet<string>
): boolean {
  if (laserWindowOpen || !groups || laserGroupNames.size === 0) {
    return false
  }
  for (const name of laserGroupNames) {
    if (isDedicatedGroupSplit(groups, name)) {
      return true
    }
  }
  return false
}

/** Hide Movers-only splits from lighting UI when the project has no movers. */
export function hideMoversSplitUi(
  hasMoverFixturesInProject: boolean,
  groups: SplitScene_t['groups'] | undefined
): boolean {
  if (hasMoverFixturesInProject) return false
  return isDedicatedGroupSplit(groups, 'Movers')
}

/** Group filter summary for one split, e.g. `all`, `not movers`, `front, back`. */
export function formatSplitGroupsLabel(
  groups: SplitScene_t['groups'] | undefined | null
): string {
  if (groups === undefined || groups === null) return 'all'
  const entries = Object.entries(groups).filter(
    (entry): entry is [string, boolean] =>
      (entry[1] === true || entry[1] === false) &&
      entry[0].trim().length > 0
  )
  if (entries.length === 0) return 'all'
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, include]) => `${include === false ? 'not ' : ''}${group}`)
    .join(', ')
}

/** True when this split targets exactly one included group (auto-managed / laser splits). */
export function isDedicatedGroupSplit(
  groups: SplitScene_t['groups'] | undefined,
  group: string
): boolean {
  if (!groups) return false
  const entries = Object.entries(groups).filter(
    ([, included]) => included !== undefined
  )
  return (
    entries.length === 1 &&
    entries[0]![0] === group &&
    entries[0]![1] === true
  )
}

/** Split heading for UI, e.g. `Split 1 - all`, `Split 2 - not movers`. */
export function splitDisplayName(
  splitIndex: number,
  groups: SplitScene_t['groups'] | undefined | null
): string {
  return `Split ${splitIndex + 1} - ${formatSplitGroupsLabel(groups)}`
}

/**
 * First split row shown in modulation UI (same visibility rules as the matrix).
 * LFO previews use this split so inter-mod matches what you see in the modulators panel.
 */
export function firstModUiSplitIx(
  videoEnabled: boolean,
  hasMoverFixturesInProject: boolean,
  splitScenes: readonly { groups?: SplitScene_t['groups'] }[],
  laserWindowOpen = true,
  laserGroupNames: ReadonlySet<string> = new Set<string>()
): number {
  for (let i = 0; i < splitScenes.length; i++) {
    const groups = splitScenes[i]?.groups
    if (hideVisSplitUi(videoEnabled, groups)) continue
    if (hideMoversSplitUi(hasMoverFixturesInProject, groups)) continue
    if (hideLaserSplitUi(laserWindowOpen, groups, laserGroupNames)) continue
    return i
  }
  return 0
}
