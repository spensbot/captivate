import { useCallback, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useActiveLightScene, useTypedSelector } from '../redux/store'
import {
  bindingForId,
  ensureLaserGroupSplit,
  ensureLaserParamOnSplit,
  findLaserGroupSplitIndex,
  type LaserParamBindingId,
} from './laserSplitLink'
import {
  createDefaultLaserGroupSlot,
  groupSlotToRoutes,
  type LaserGroupSlot,
  type LaserParamRouteMode,
  type LaserRouteState,
} from './laserGroupState'
import {
  patchGroupSlot,
  patchRoutes,
  setActiveLaserGroup,
  setActiveLaserSceneId,
  setGroupSlots,
  setRoutes,
} from '../redux/laserSlice'

export type { LaserRouteState } from './laserGroupState'

function routesToSlot(
  routes: LaserRouteState,
  activeSceneId: string | null
): LaserGroupSlot {
  return {
    activeSceneId,
    dotDensityRoute: routes.dotDensityRoute,
    scanMotionRoute: routes.scanMotionRoute,
    beamColorRoute: routes.beamColorRoute,
    playbackSpeedRoute: routes.playbackSpeedRoute,
    animationProgressRoute: routes.animationProgressRoute,
    manualDotSamples: routes.manualDotSamples,
    scanPathPhase01: routes.scanPathPhase01,
    animSpeed: routes.animSpeed,
    animationProgress01: routes.animationProgress01,
  }
}

export function useLaserGroupController(groupNames: string[]) {
  const dispatch = useDispatch()
  const lightScene = useActiveLightScene((s) => s)
  const laser = useTypedSelector((s) => s.laser)

  const activeLaserGroup = laser.activeLaserGroup
  const groupSlots = laser.groupSlots
  const routes = laser.routes
  const activeSceneId = laser.activeLaserSceneId

  const laserSplitIndex = useMemo(
    () => findLaserGroupSplitIndex(lightScene, activeLaserGroup),
    [lightScene, activeLaserGroup]
  )

  useEffect(() => {
    for (const g of groupNames) {
      ensureLaserGroupSplit(dispatch, g)
    }
    let next: Record<string, LaserGroupSlot> | null = null
    for (const g of groupNames) {
      if (!laser.groupSlots[g]) {
        if (!next) next = { ...laser.groupSlots }
        next[g] = createDefaultLaserGroupSlot(
          g === laser.activeLaserGroup.trim() ? laser.activeLaserSceneId : null
        )
      }
    }
    if (next) dispatch(setGroupSlots(next))
  }, [groupNames, dispatch, laser.activeLaserGroup, laser.activeLaserSceneId, laser.groupSlots])

  const setActiveLaserGroupAndLoad = useCallback(
    (group: string) => {
      const g = group.trim()
      if (!g) return
      const g0 = activeLaserGroup.trim()
      const merged =
        g0.length > 0
          ? {
              ...groupSlots,
              [g0]: routesToSlot(routes, activeSceneId),
            }
          : { ...groupSlots }
      const slot = merged[g] ?? createDefaultLaserGroupSlot(null)
      ensureLaserGroupSplit(dispatch, g)
      dispatch(setGroupSlots(merged))
      dispatch(setRoutes(groupSlotToRoutes(slot)))
      dispatch(setActiveLaserSceneId(slot.activeSceneId))
      dispatch(setActiveLaserGroup(g))
    },
    [activeLaserGroup, activeSceneId, dispatch, groupSlots, routes]
  )

  const latchSceneForActiveGroup = useCallback(
    (sceneId: string | null) => {
      dispatch(setActiveLaserSceneId(sceneId))
      const g = activeLaserGroup.trim()
      if (!g) return
      dispatch(
        patchGroupSlot({
          group: g,
          patch: { activeSceneId: sceneId },
        })
      )
    },
    [activeLaserGroup, dispatch]
  )

  const setGroupLatchedScene = useCallback(
    (group: string, sceneId: string | null) => {
      const g = group.trim()
      if (!g) return
      dispatch(patchGroupSlot({ group: g, patch: { activeSceneId: sceneId } }))
      if (g === activeLaserGroup.trim()) {
        dispatch(setActiveLaserSceneId(sceneId))
      }
    },
    [activeLaserGroup, dispatch]
  )

  const setRouteMode = useCallback(
    (
      bindingId: LaserParamBindingId,
      mode: LaserParamRouteMode,
      seedValue?: number
    ) => {
      if (mode === 'split') {
        ensureLaserParamOnSplit(
          dispatch,
          lightScene,
          activeLaserGroup,
          bindingForId(bindingId),
          seedValue
        )
      }
      const key =
        bindingId === 'dotDensity'
          ? 'dotDensityRoute'
          : bindingId === 'scanPath'
            ? 'scanMotionRoute'
            : bindingId === 'beamHue'
              ? 'beamColorRoute'
              : bindingId === 'playbackSpeed'
                ? 'playbackSpeedRoute'
                : 'animationProgressRoute'
      dispatch(
        patchRoutes({
          [key]: mode,
        } as Partial<LaserRouteState>)
      )
    },
    [activeLaserGroup, dispatch, lightScene]
  )

  return {
    activeLaserGroup,
    setActiveLaserGroup: setActiveLaserGroupAndLoad,
    laserSplitIndex,
    activeSceneId,
    setActiveSceneId: latchSceneForActiveGroup,
    groupSlots,
    setGroupLatchedScene,
    routes,
    setRoutes: (next: LaserRouteState | ((p: LaserRouteState) => LaserRouteState)) => {
      if (typeof next === 'function') {
        dispatch(setRoutes(next(routes)))
      } else {
        dispatch(setRoutes(next))
      }
    },
    setRouteMode,
  }
}
