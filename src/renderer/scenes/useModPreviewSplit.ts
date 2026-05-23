import { useMemo } from 'react'
import { useActiveLightScene, useDmxSelector, useTypedSelector } from '../redux/store'
import { universeHasMovers } from 'shared/dmxFixtures'
import { collectLaserLightingGroupNames } from '../laser/laserSplitLink'
import { firstModUiSplitIx } from './splitUiVisibility'

/** Split index for LFO previews + inter-mod (first visible modulation matrix row). */
export function useModPreviewSplit(): number {
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const laserWindowOpen = useTypedSelector((state) => state.gui.laserWindowOpen)
  const laser = useTypedSelector((state) => state.laser)
  const laserGroupNames = useMemo(
    () => new Set(collectLaserLightingGroupNames(laser)),
    [laser.groupSlots, laser.units]
  )
  const hasMoverFixtures = useDmxSelector((dmx) =>
    universeHasMovers(dmx.universe, dmx.fixtureTypesByID)
  )
  const splitScenes = useActiveLightScene((scene) => scene.splitScenes)
  return useMemo(
    () =>
      firstModUiSplitIx(
        videoEnabled,
        hasMoverFixtures,
        splitScenes,
        laserWindowOpen,
        laserGroupNames
      ),
    [
      videoEnabled,
      hasMoverFixtures,
      splitScenes,
      laserWindowOpen,
      laserGroupNames,
    ]
  )
}

/** @deprecated Use {@link useModPreviewSplit}. */
export const useModulationPreviewSplitIndex = useModPreviewSplit
