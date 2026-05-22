import type { ReduxDispatch } from '../redux/store'
import { ensureSplitSceneForGroup, setBaseParams } from '../redux/controlSlice'
import type { LightScene_t } from '../../shared/Scenes'
import { initParams } from '../../shared/params'
import { isDedicatedGroupSplit } from '../scenes/splitUiVisibility'

/** Params owned by the laser engine when linked to a lighting split. */
export const LASER_SPLIT_PARAM_KEYS = [
  'laserDotDensity',
  'laserScanPath',
  'laserPlaybackSpeed',
  'laserAnimProgress',
  'laserBeamHue',
  'x',
  'y',
  'width',
  'height',
] as const

export type LaserSplitParamKey = (typeof LASER_SPLIT_PARAM_KEYS)[number]

export type LaserParamBindingId =
  | 'dotDensity'
  | 'scanPath'
  | 'playbackSpeed'
  | 'animProgress'
  | 'beamHue'
  | 'maskX'
  | 'maskY'
  | 'maskWidth'
  | 'maskHeight'

export type LaserParamBinding = {
  id: LaserParamBindingId
  label: string
  splitParam: LaserSplitParamKey
  defaultValue: number
}

export const LASER_PARAM_BINDINGS: LaserParamBinding[] = [
  {
    id: 'dotDensity',
    label: 'Dot density',
    splitParam: 'laserDotDensity',
    defaultValue: 0.5,
  },
  {
    id: 'scanPath',
    label: 'Scan path',
    splitParam: 'laserScanPath',
    defaultValue: 0,
  },
  {
    id: 'playbackSpeed',
    label: 'Playback speed',
    splitParam: 'laserPlaybackSpeed',
    defaultValue: 0.5,
  },
  {
    id: 'animProgress',
    label: 'Animation progress',
    splitParam: 'laserAnimProgress',
    defaultValue: 0,
  },
  {
    id: 'beamHue',
    label: 'Beam color (solid)',
    splitParam: 'laserBeamHue',
    defaultValue: 0.5,
  },
  {
    id: 'maskX',
    label: 'Mask X',
    splitParam: 'x',
    defaultValue: 0.5,
  },
  {
    id: 'maskY',
    label: 'Mask Y',
    splitParam: 'y',
    defaultValue: 0.5,
  },
  {
    id: 'maskWidth',
    label: 'Mask width',
    splitParam: 'width',
    defaultValue: 1,
  },
  {
    id: 'maskHeight',
    label: 'Mask height',
    splitParam: 'height',
    defaultValue: 1,
  },
]

const LASER_KEEP = new Set<string>(LASER_SPLIT_PARAM_KEYS)

const STRIP_FROM_LASER_SPLIT = Object.keys(initParams()).filter(
  (k) => !LASER_KEEP.has(k)
)

export function findLaserGroupSplitIndex(
  scene: LightScene_t | undefined,
  group: string
): number {
  if (!scene || !group.trim()) return -1
  const g = group.trim()
  return scene.splitScenes.findIndex((split) => split.groups[g] === true)
}

export function isLaserDedicatedSplit(
  groups: Record<string, boolean | undefined> | undefined,
  group: string
): boolean {
  return isDedicatedGroupSplit(groups, group.trim())
}

/** Ensure a dedicated split exists for this laser fixture group (minimal param set). */
export function ensureLaserGroupSplit(
  dispatch: ReduxDispatch,
  group: string
): void {
  const g = group.trim()
  if (!g) return
  dispatch(
    ensureSplitSceneForGroup({
      group: g,
      removeParams: STRIP_FROM_LASER_SPLIT,
    })
  )
}

export function ensureLaserParamOnSplit(
  dispatch: ReduxDispatch,
  scene: LightScene_t | undefined,
  group: string,
  binding: LaserParamBinding,
  seedValue?: number
): number {
  const g = group.trim()
  if (!g) return 0
  ensureLaserGroupSplit(dispatch, g)
  const splitIndex = findLaserGroupSplitIndex(scene, g)
  const ix = splitIndex >= 0 ? splitIndex : 0
  const value =
    seedValue !== undefined && Number.isFinite(seedValue)
      ? seedValue
      : binding.defaultValue
  dispatch(
    setBaseParams({
      splitIndex: ix,
      params: { [binding.splitParam]: value },
    })
  )
  return ix
}

export function bindingForId(id: LaserParamBindingId): LaserParamBinding {
  const b = LASER_PARAM_BINDINGS.find((x) => x.id === id)
  if (!b) throw new Error(`Unknown laser binding: ${id}`)
  return b
}
