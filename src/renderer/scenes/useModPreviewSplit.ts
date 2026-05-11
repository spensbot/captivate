import { useMemo } from 'react'
import { useActiveLightScene, useDmxSelector, useTypedSelector } from '../redux/store'
import { universeHasMovers } from 'shared/dmxFixtures'
import { firstModUiSplitIx } from './splitUiVisibility'

/** Split index for LFO previews + inter-mod (first visible modulation matrix row). */
export function useModPreviewSplit(): number {
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const hasMoverFixtures = useDmxSelector((dmx) =>
    universeHasMovers(dmx.universe, dmx.fixtureTypesByID)
  )
  const splitScenes = useActiveLightScene((scene) => scene.splitScenes)
  return useMemo(
    () => firstModUiSplitIx(videoEnabled, hasMoverFixtures, splitScenes),
    [videoEnabled, hasMoverFixtures, splitScenes]
  )
}

/** @deprecated Use {@link useModPreviewSplit}. */
export const useModulationPreviewSplitIndex = useModPreviewSplit
