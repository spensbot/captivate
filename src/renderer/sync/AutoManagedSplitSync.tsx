import { useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import {
  useActiveLightScene,
  useControlSelector,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import {
  ensureSplitSceneForGroup,
  removeSplitSceneByIndex,
  restoreSplitSceneForGroup,
} from 'renderer/redux/controlSlice'
import { hasMoverFixtureInUniverse } from '../../shared/dmxFixtures'
import { getAtmosphericsFixtureDescriptors } from '../../shared/atmosphericsMapping'
import { LightScene_t, SplitScene_t } from '../../shared/Scenes'

interface CachedAutoSplit {
  splitScene: SplitScene_t
  splitModulations: Array<{ [key: string]: number | undefined }>
}

type AutoSplitCacheByScene = {
  [sceneId: string]: {
    [group: string]: CachedAutoSplit | undefined
  }
}

const autoSplitSessionCache: AutoSplitCacheByScene = {}

function isDedicatedAutoGroupSplit(
  groups: SplitScene_t['groups'],
  group: string
) {
  const entries = Object.entries(groups).filter(
    ([_, included]) => included !== undefined
  )
  return (
    entries.length === 1 &&
    entries[0][0] === group &&
    entries[0][1] === true
  )
}

function createSplitSnapshot(
  scene: LightScene_t,
  splitIndex: number
): CachedAutoSplit | null {
  const splitScene = scene.splitScenes[splitIndex]
  if (splitScene === undefined) return null
  return {
    splitScene: {
      baseParams: { ...splitScene.baseParams },
      randomizer: { ...splitScene.randomizer },
      groups: { ...splitScene.groups },
    },
    splitModulations: scene.modulators.map((modulator) => ({
      ...(modulator.splitModulations[splitIndex] ?? {}),
    })),
  }
}

export default function AutoManagedSplitSync() {
  const dispatch = useDispatch()
  const activeScene = useControlSelector((scenes) => scenes.light.active)
  const activeLightScene = useActiveLightScene((scene) => scene)
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const dmx = useDmxSelector((state) => state)
  const hasMovers = useMemo(
    () => hasMoverFixtureInUniverse(dmx.universe, dmx.fixtureTypesByID),
    [dmx.fixtureTypesByID, dmx.universe]
  )
  const hasAtmospherics = useMemo(
    () => getAtmosphericsFixtureDescriptors(dmx).length > 0,
    [dmx]
  )
  const hasLedFixtures = useMemo(
    () => dmx.led.ledFixtures.length > 0,
    [dmx.led.ledFixtures.length]
  )

  const autoManagedGroupStates = useMemo(
    () => [
      {
        group: 'Movers',
        present: hasMovers,
        defaultParams: {
          xAxis: 0.5,
          yAxis: 0.5,
          moverFloorLock: 1,
          moverSpread: 0,
          moverMirrorX: 0,
          moverMirrorY: 0,
          moverMode: 0,
        } as const,
      },
      {
        group: 'Atmosphere',
        present: hasAtmospherics,
        defaultParams: {
          atmosFxOnOff: 0.5,
          atmosFxLevel: 1,
        } as const,
      },
      {
        group: 'LEDs',
        present: hasLedFixtures,
        defaultParams: {
          hue: 0.5,
          saturation: 0.5,
          brightness: 0.5,
          white: 0,
        } as const,
        removeParams: ['warmWhite', 'amber', 'uv'],
      },
      {
        group: 'Visualizer',
        present: videoEnabled,
      },
    ],
    [hasAtmospherics, hasLedFixtures, hasMovers, videoEnabled]
  )

  useEffect(() => {
    const scene = activeLightScene
    if (scene === undefined) return

    const cacheByGroup =
      autoSplitSessionCache[activeScene] ??
      (autoSplitSessionCache[activeScene] = {})
    let didMutate = false

    for (const groupState of autoManagedGroupStates) {
      const splitIndex = scene.splitScenes.findIndex(
        (split) => split.groups[groupState.group] === true
      )
      if (groupState.present) {
        const cached = cacheByGroup[groupState.group]
        if (cached !== undefined && splitIndex < 0) {
          dispatch(
            restoreSplitSceneForGroup({
              group: groupState.group,
              splitScene: cached.splitScene,
              splitModulations: cached.splitModulations,
            })
          )
          delete cacheByGroup[groupState.group]
          didMutate = true
          break
        }
        if (cached !== undefined && splitIndex >= 0) {
          delete cacheByGroup[groupState.group]
        }

        if (splitIndex < 0) {
          dispatch(
            ensureSplitSceneForGroup({
              group: groupState.group,
              defaultParams:
                groupState.defaultParams === undefined
                  ? undefined
                  : { ...groupState.defaultParams },
              removeParams: groupState.removeParams,
            })
          )
          didMutate = true
          break
        }
        continue
      }

      if (splitIndex < 0) continue

      const splitScene = scene.splitScenes[splitIndex]
      if (
        splitScene === undefined ||
        !isDedicatedAutoGroupSplit(splitScene.groups, groupState.group)
      ) {
        continue
      }

      const snapshot = createSplitSnapshot(scene, splitIndex)
      if (snapshot !== null) {
        cacheByGroup[groupState.group] = snapshot
      }
      dispatch(removeSplitSceneByIndex(splitIndex))
      didMutate = true
      break
    }

    if (didMutate) {
      return
    }
  }, [activeLightScene, activeScene, autoManagedGroupStates, dispatch])

  return null
}

