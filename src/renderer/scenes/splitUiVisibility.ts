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
  return groups?.Visualizer === true
}

/** Show Visualizer group in pickers only while detached visualizer is active. */
export function showVisGroupUi(videoEnabled: boolean): boolean {
  return videoEnabled === true
}

/** Hide Movers-only splits from lighting UI when the project has no movers. */
export function hideMoversSplitUi(
  hasMoverFixturesInProject: boolean,
  groups: SplitScene_t['groups'] | undefined
): boolean {
  if (hasMoverFixturesInProject) return false
  return groups?.Movers === true
}
