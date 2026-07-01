import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LaserScene } from '../laser/laserEditorTypes'
import {
  createDefaultLaserDacProfile,
  createDefaultLaserNetworkNode,
  createUnassignedRoute,
  type LaserDacProfile,
  type LaserFixtureOutputRoute,
  type LaserNetworkNode,
} from '../../shared/laserFixtureRouting'
import type {
  LaserProjectState,
  LaserFixtureUnitState,
} from '../laser/laserProjectState'
import {
  initLaserState as initLaser,
  migrateLaserProjectState as migrateLaser,
} from '../laser/laserProjectState'
import {
  createDefaultLaserGroupSlot,
  type LaserGroupSlot,
  type LaserRouteState,
} from '../laser/laserGroupState'
import { DEFAULT_LASER_RGB_CAPABILITIES } from '../laser/laserBeamColor'
import type { LaserRgbCapabilities } from '../laser/laserEditorTypes'

export { initLaserState, migrateLaserProjectState } from '../laser/laserProjectState'

export type LaserState = LaserProjectState

const laserSlice = createSlice({
  name: 'laser',
  initialState: initLaser(),
  reducers: {
    replaceLaserState: (_, { payload }: PayloadAction<LaserProjectState>) =>
      migrateLaser(payload),
    setDacProfiles: (state, { payload }: PayloadAction<LaserDacProfile[]>) => {
      state.dacProfiles = payload
    },
    setActiveDacProfileId: (state, { payload }: PayloadAction<string>) => {
      state.activeDacProfileId = payload
    },
    patchDacProfile: (
      state,
      { payload }: PayloadAction<{ id: string; patch: Partial<LaserDacProfile> }>
    ) => {
      const i = state.dacProfiles.findIndex((p) => p.id === payload.id)
      if (i >= 0) {
        state.dacProfiles[i] = { ...state.dacProfiles[i]!, ...payload.patch }
      }
    },
    setNetworkNodes: (state, { payload }: PayloadAction<LaserNetworkNode[]>) => {
      state.networkNodes = payload
    },
    setUnits: (state, { payload }: PayloadAction<LaserFixtureUnitState[]>) => {
      state.units = payload
    },
    patchUnit: (
      state,
      {
        payload,
      }: PayloadAction<{
        id: string
        patch: Partial<LaserFixtureUnitState> & {
          laserChannels?: LaserRgbCapabilities
          outputRoute?: LaserFixtureOutputRoute
        }
      }>
    ) => {
      const i = state.units.findIndex((u) => u.id === payload.id)
      if (i >= 0) {
        state.units[i] = { ...state.units[i]!, ...payload.patch }
      }
    },
    setSelectedUnitId: (state, { payload }: PayloadAction<string>) => {
      state.selectedUnitId = payload
    },
    setLaserScenes: (state, { payload }: PayloadAction<LaserScene[]>) => {
      state.laserScenes = payload
    },
    setActiveLaserSceneId: (state, { payload }: PayloadAction<string | null>) => {
      state.activeLaserSceneId = payload
    },
    setActiveLaserGroup: (state, { payload }: PayloadAction<string>) => {
      state.activeLaserGroup = payload
    },
    setGroupSlots: (
      state,
      { payload }: PayloadAction<Record<string, LaserGroupSlot>>
    ) => {
      state.groupSlots = payload
    },
    patchGroupSlot: (
      state,
      { payload }: PayloadAction<{ group: string; patch: Partial<LaserGroupSlot> }>
    ) => {
      const g = payload.group.trim()
      if (!g) return
      state.groupSlots[g] = {
        ...(state.groupSlots[g] ?? createDefaultLaserGroupSlot(null)),
        ...payload.patch,
      }
    },
    setRoutes: (state, { payload }: PayloadAction<LaserRouteState>) => {
      state.routes = payload
    },
    patchRoutes: (state, { payload }: PayloadAction<Partial<LaserRouteState>>) => {
      state.routes = { ...state.routes, ...payload }
    },
    setLaserScenePage: (state, { payload }: PayloadAction<number>) => {
      state.laserScenePage = payload
    },
    setSceneStripHeightPx: (state, { payload }: PayloadAction<number>) => {
      state.sceneStripHeightPx = payload
    },
    setEnableProjectionMask: (state, { payload }: PayloadAction<boolean>) => {
      state.enableProjectionMask = payload
    },
    setAudienceScanGate: (state, { payload }: PayloadAction<boolean>) => {
      state.audienceScanGate = payload
    },
    setShowZonePreview: (state, { payload }: PayloadAction<boolean>) => {
      state.showZonePreview = payload
    },
    setLaserDacSetupComplete: (state, { payload }: PayloadAction<boolean>) => {
      state.laserDacSetupComplete = payload === true
    },
    addNetworkNode: (state) => {
      state.networkNodes.push(
        createDefaultLaserNetworkNode(state.networkNodes.length + 1)
      )
    },
    addDacProfile: (state) => {
      const p = createDefaultLaserDacProfile(
        `dac-${Date.now()}`,
        `DAC ${state.dacProfiles.length + 1}`
      )
      state.dacProfiles.push(p)
      state.activeDacProfileId = p.id
    },
    addUnit: (state) => {
      const profile =
        state.dacProfiles.find((p) => p.id === state.activeDacProfileId) ??
        state.dacProfiles[0]!
      const zoneId =
        profile.zones[state.units.length % profile.zones.length]?.id ??
        profile.zones[0]?.id ??
        ''
      const id = `laser-${Date.now()}-${state.units.length + 1}`
      state.units.push({
        id,
        name: `Laser ${state.units.length + 1}`,
        group: 'Main Lasers',
        enabled: true,
        laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
        outputRoute:
          zoneId.length > 0
            ? {
                kind: 'dac_zone',
                dacProfileId: profile.id,
                zoneId,
              }
            : createUnassignedRoute(),
      })
      state.selectedUnitId = id
    },
    removeUnit: (state, { payload }: PayloadAction<string>) => {
      state.units = state.units.filter((u) => u.id !== payload)
      if (state.selectedUnitId === payload) {
        state.selectedUnitId = state.units[0]?.id ?? ''
      }
    },
  },
})

export const {
  replaceLaserState,
  setDacProfiles,
  setActiveDacProfileId,
  patchDacProfile,
  setNetworkNodes,
  setUnits,
  patchUnit,
  setSelectedUnitId,
  setLaserScenes,
  setActiveLaserSceneId,
  setActiveLaserGroup,
  setGroupSlots,
  patchGroupSlot,
  setRoutes,
  patchRoutes,
  setLaserScenePage,
  setSceneStripHeightPx,
  setEnableProjectionMask,
  setAudienceScanGate,
  setShowZonePreview,
  setLaserDacSetupComplete,
  addNetworkNode,
  addDacProfile,
  addUnit,
  removeUnit,
} = laserSlice.actions

export default laserSlice.reducer
