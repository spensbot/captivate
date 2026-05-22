import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../redux/store'
import {
  addDacProfile,
  addNetworkNode,
  addUnit,
  patchDacProfile,
  patchUnit,
  removeUnit,
  setActiveDacProfileId,
  setAudienceScanGate,
  setDacProfiles,
  setEnableProjectionMask,
  setLaserScenePage,
  setLaserScenes,
  setNetworkNodes,
  setSceneStripHeightPx,
  setSelectedUnitId,
  setShowZonePreview,
  setUnits,
} from '../redux/laserSlice'
import type { LaserDacProfile } from '../../shared/laserFixtureRouting'
import type { LaserFixtureUnitState } from './laserProjectState'
import type { LaserScene } from './laserEditorTypes'

/** Redux-backed laser project fields used by the Laser page. */
export function useLaserPageStore() {
  const dispatch = useDispatch()
  const laser = useTypedSelector((s) => s.laser)

  return {
    laser,
    setDacProfiles: useCallback(
      (v: LaserDacProfile[] | ((p: LaserDacProfile[]) => LaserDacProfile[])) => {
        dispatch(
          setDacProfiles(typeof v === 'function' ? v(laser.dacProfiles) : v)
        )
      },
      [dispatch, laser.dacProfiles]
    ),
    setActiveDacProfileId: useCallback(
      (id: string) => dispatch(setActiveDacProfileId(id)),
      [dispatch]
    ),
    patchDacProfile: useCallback(
      (id: string, patch: Partial<LaserDacProfile>) =>
        dispatch(patchDacProfile({ id, patch })),
      [dispatch]
    ),
    setNetworkNodes: useCallback(
      (v: typeof laser.networkNodes | ((p: typeof laser.networkNodes) => typeof laser.networkNodes)) => {
        dispatch(
          setNetworkNodes(typeof v === 'function' ? v(laser.networkNodes) : v)
        )
      },
      [dispatch, laser.networkNodes]
    ),
    setUnits: useCallback(
      (v: LaserFixtureUnitState[] | ((p: LaserFixtureUnitState[]) => LaserFixtureUnitState[])) => {
        dispatch(setUnits(typeof v === 'function' ? v(laser.units) : v))
      },
      [dispatch, laser.units]
    ),
    patchUnit: useCallback(
      (id: string, patch: Parameters<typeof patchUnit>[0]['patch']) =>
        dispatch(patchUnit({ id, patch })),
      [dispatch]
    ),
    setSelectedUnitId: useCallback(
      (id: string) => dispatch(setSelectedUnitId(id)),
      [dispatch]
    ),
    setLaserScenes: useCallback(
      (v: LaserScene[] | ((p: LaserScene[]) => LaserScene[])) => {
        dispatch(setLaserScenes(typeof v === 'function' ? v(laser.laserScenes) : v))
      },
      [dispatch, laser.laserScenes]
    ),
    setLaserScenePage: useCallback(
      (p: number) => dispatch(setLaserScenePage(p)),
      [dispatch]
    ),
    setSceneStripHeightPx: useCallback(
      (h: number) => dispatch(setSceneStripHeightPx(h)),
      [dispatch]
    ),
    setEnableProjectionMask: useCallback(
      (v: boolean) => dispatch(setEnableProjectionMask(v)),
      [dispatch]
    ),
    setAudienceScanGate: useCallback(
      (v: boolean) => dispatch(setAudienceScanGate(v)),
      [dispatch]
    ),
    setShowZonePreview: useCallback(
      (v: boolean) => dispatch(setShowZonePreview(v)),
      [dispatch]
    ),
    addUnit: useCallback(() => dispatch(addUnit()), [dispatch]),
    removeUnit: useCallback((id: string) => dispatch(removeUnit(id)), [dispatch]),
    addDacProfile: useCallback(() => dispatch(addDacProfile()), [dispatch]),
    addNetworkNode: useCallback(() => dispatch(addNetworkNode()), [dispatch]),
  }
}
