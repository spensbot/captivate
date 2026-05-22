import type { LaserScene, LaserRgbCapabilities } from './laserEditorTypes'
import { createEmptyLaserScene } from './LaserSceneStrip'
import { LASER_SCENE_STRIP_DEFAULT_HEIGHT_PX } from './laserLayoutConstants'
import {
  createDefaultLaserDacProfile,
  createDefaultProjectionZone,
  type LaserDacProfile,
  type LaserFixtureOutputRoute,
  LaserNetworkNode,
} from '../../shared/laserFixtureRouting'
import {
  createDefaultLaserGroupSlot,
  type LaserGroupSlot,
  type LaserRouteState,
} from './laserGroupState'
import { DEFAULT_LASER_RGB_CAPABILITIES } from './laserBeamColor'

export type LaserFixtureUnitState = {
  id: string
  name: string
  group: string
  enabled: boolean
  laserChannels: LaserRgbCapabilities
  outputRoute: LaserFixtureOutputRoute
}

/** Serializable laser engine state stored in project files. */
export type LaserProjectState = {
  dacProfiles: LaserDacProfile[]
  activeDacProfileId: string
  networkNodes: LaserNetworkNode[]
  units: LaserFixtureUnitState[]
  selectedUnitId: string
  laserScenes: LaserScene[]
  activeLaserSceneId: string | null
  activeLaserGroup: string
  groupSlots: Record<string, LaserGroupSlot>
  routes: LaserRouteState
  laserScenePage: number
  sceneStripHeightPx: number
  enableProjectionMask: boolean
  audienceScanGate: boolean
  showZonePreview: boolean
}

const BOOT_DAC = (() => {
  const p = createDefaultLaserDacProfile()
  if (p.zones.length < 2) p.zones.push(createDefaultProjectionZone(2))
  return p
})()

function defaultUnits(): LaserFixtureUnitState[] {
  return [
    {
      id: 'laser-front-left',
      name: 'Laser Front Left',
      group: 'Main Lasers',
      enabled: true,
      laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
      outputRoute: {
        kind: 'dac_zone',
        dacProfileId: BOOT_DAC.id,
        zoneId: BOOT_DAC.zones[0]!.id,
      },
    },
    {
      id: 'laser-front-right',
      name: 'Laser Front Right',
      group: 'Main Lasers',
      enabled: true,
      laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
      outputRoute: {
        kind: 'dac_zone',
        dacProfileId: BOOT_DAC.id,
        zoneId: BOOT_DAC.zones[1]!.id,
      },
    },
  ]
}

export function initLaserState(): LaserProjectState {
  const first = createEmptyLaserScene('Graphic 1')
  const group = 'Main Lasers'
  return {
    dacProfiles: [BOOT_DAC],
    activeDacProfileId: BOOT_DAC.id,
    networkNodes: [],
    units: defaultUnits(),
    selectedUnitId: 'laser-front-left',
    laserScenes: [first],
    activeLaserSceneId: first.id,
    activeLaserGroup: group,
    groupSlots: { [group]: createDefaultLaserGroupSlot(first.id) },
    routes: {
      dotDensityRoute: 'manual',
      scanMotionRoute: 'manual',
      beamColorRoute: 'manual',
      playbackSpeedRoute: 'manual',
      animationProgressRoute: 'manual',
      manualDotSamples: 220,
      scanPathPhase01: 0,
      animSpeed: 1,
      animationProgress01: 0,
    },
    laserScenePage: 0,
    sceneStripHeightPx: LASER_SCENE_STRIP_DEFAULT_HEIGHT_PX,
    enableProjectionMask: true,
    audienceScanGate: true,
    showZonePreview: true,
  }
}

export function migrateLaserProjectState(raw: unknown): LaserProjectState {
  const base = initLaserState()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Partial<LaserProjectState>
  const dacProfiles =
    Array.isArray(o.dacProfiles) && o.dacProfiles.length > 0
      ? o.dacProfiles.map((p) => ({
          ...p,
          zones: (p.zones ?? []).map((z, i) => ({
            ...z,
            clipOutside: z.clipOutside !== false,
            priority: Number.isFinite(z.priority) ? z.priority! : i,
          })),
        }))
      : base.dacProfiles
  const activeDacProfileId =
    typeof o.activeDacProfileId === 'string' &&
    dacProfiles.some((p) => p.id === o.activeDacProfileId)
      ? o.activeDacProfileId
      : dacProfiles[0]!.id
  return {
    ...base,
    ...o,
    dacProfiles,
    activeDacProfileId,
    networkNodes: Array.isArray(o.networkNodes) ? o.networkNodes : [],
    units: Array.isArray(o.units) ? o.units : base.units,
    laserScenes: Array.isArray(o.laserScenes) ? o.laserScenes : base.laserScenes,
    groupSlots:
      o.groupSlots && typeof o.groupSlots === 'object'
        ? o.groupSlots
        : base.groupSlots,
    routes: { ...base.routes, ...(o.routes ?? {}) },
    showZonePreview: o.showZonePreview !== false,
  }
}
