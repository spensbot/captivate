export type LaserParamRouteMode = 'manual' | 'split'

export type LaserRouteState = {
  dotDensityRoute: LaserParamRouteMode
  scanMotionRoute: LaserParamRouteMode
  beamColorRoute: LaserParamRouteMode
  playbackSpeedRoute: LaserParamRouteMode
  animationProgressRoute: LaserParamRouteMode
  manualDotSamples: number
  scanPathPhase01: number
  animSpeed: number
  animationProgress01: number
}

export type LaserGroupSlot = {
  activeSceneId: string | null
  dotDensityRoute: LaserParamRouteMode
  scanMotionRoute: LaserParamRouteMode
  beamColorRoute: LaserParamRouteMode
  playbackSpeedRoute: LaserParamRouteMode
  animationProgressRoute: LaserParamRouteMode
  manualDotSamples: number
  scanPathPhase01: number
  animSpeed: number
  animationProgress01: number
}

/** Live UI buffer for the active group; persisted slots use {@link LaserGroupSlot}. */
export function groupSlotToRoutes(slot: LaserGroupSlot): LaserRouteState {
  return {
    dotDensityRoute: slot.dotDensityRoute,
    scanMotionRoute: slot.scanMotionRoute,
    beamColorRoute: slot.beamColorRoute,
    playbackSpeedRoute: slot.playbackSpeedRoute,
    animationProgressRoute: slot.animationProgressRoute,
    manualDotSamples: slot.manualDotSamples,
    scanPathPhase01: slot.scanPathPhase01,
    animSpeed: slot.animSpeed,
    animationProgress01: slot.animationProgress01,
  }
}

/** Active group reads `routes`; other groups use their saved slot. */
export function resolveRoutesForGroup(
  group: string,
  activeGroup: string,
  routes: LaserRouteState,
  groupSlots: Record<string, LaserGroupSlot>
): LaserRouteState {
  if (group.trim() === activeGroup.trim()) return routes
  const slot = groupSlots[group]
  return groupSlotToRoutes(slot ?? createDefaultLaserGroupSlot(null))
}

export function createDefaultLaserGroupSlot(
  activeSceneId: string | null
): LaserGroupSlot {
  return {
    activeSceneId,
    dotDensityRoute: 'manual',
    scanMotionRoute: 'manual',
    beamColorRoute: 'manual',
    playbackSpeedRoute: 'manual',
    animationProgressRoute: 'manual',
    manualDotSamples: 220,
    scanPathPhase01: 0,
    animSpeed: 1,
    animationProgress01: 0,
  }
}
