import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from '../redux/store'
import { buildLedPreviewFixtures, buildLightingPreviewRows } from './lightingPreviewFixtures'

/** Memoized so unchanged `dmx.present` does not rebuild rows (avoids Lighting3D re-renders every Redux tick). */
export const selectLightingPreviewRows = createSelector(
  [(state: ReduxState) => state.dmx.present],
  (dmx) => buildLightingPreviewRows(dmx)
)

export const selectLedPreviewFixtures = createSelector(
  [(state: ReduxState) => state.dmx.present],
  (dmx) => buildLedPreviewFixtures(dmx)
)
