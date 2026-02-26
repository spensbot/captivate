import { DMX_MAX_VALUE, DMX_NUM_CHANNELS } from '../../shared/dmxFixtures'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getDmxValue,
  getFixturesInGroups,
  flatten_fixtures,
  forEachChannel,
  getDefaultDmxValue,
} from '../../shared/dmxUtil'
import { indexArray, zip } from '../../shared/util'
import { TimeState } from '../../shared/TimeState'
import { SplitState } from 'renderer/redux/realtimeStore'
import { getUniverseOverwrites } from '../../renderer/redux/mixerSlice'

function getUniverseCount(state: CleanReduxState): number {
  const configuredUniverseCount =
    state.control.device.connectionSettings.universeCount ?? 1

  const maxFixtureUniverse = state.dmx.universe.reduce((maxUniverse, fixture) => {
    const fixtureUniverse = fixture.universe ?? 1
    return Math.max(maxUniverse, fixtureUniverse)
  }, 1)

  return Math.max(1, configuredUniverseCount, maxFixtureUniverse)
}

function calculateDmxForUniverse(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState,
  universeIndex: number
): number[] {
  const universeFixtures = state.dmx.universe.filter(
    (fixture) => (fixture.universe ?? 1) === universeIndex
  )
  const all_fixtures = flatten_fixtures(
    universeFixtures,
    state.dmx.fixtureTypesByID
  )

  // All channels start at 0
  let channels = Array(DMX_NUM_CHANNELS).fill(0)

  if (timeState.isPlaying) {
    // Set each channel to it's default value
    forEachChannel(all_fixtures, (_fixtureIdx, _fixture, channelIdx, channel) => {
      channels[channelIdx] = getDefaultDmxValue(channel)
    })

    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]

    for (const [{ outputParams, randomizer }, splitScene] of zip(
      splitStates,
      activeScene.splitScenes
    )) {
      const splitGroups = splitScene.groups

      const splitSceneFixtures = getFixturesInGroups(all_fixtures, splitGroups)

      // Set each channel based on active scene fixtures
      forEachChannel(
        splitSceneFixtures,
        (fixtureIdx, fixture, channelIdx, channel) => {
          const randomizerLevel = randomizer[fixtureIdx]?.level ?? 1
          channels[channelIdx] = Math.max(
            channels[channelIdx],
            getDmxValue(
              channel,
              outputParams,
              fixture,
              state.control.master,
              randomizerLevel,
              timeState
            )
          )
        }
      )
    }

    // Apply any overwrites
    const overwrites = getUniverseOverwrites(state.mixer, universeIndex)
    indexArray(DMX_NUM_CHANNELS).forEach((i) => {
      const overwrite = overwrites[i]
      if (overwrite !== undefined) {
        channels[i] = overwrite * DMX_MAX_VALUE
      }
    })
  }

  return channels
}

export function calculateDmx(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState
): number[][] {
  const universeCount = getUniverseCount(state)
  const outputByUniverse: number[][] = []

  for (let universeIndex = 1; universeIndex <= universeCount; universeIndex++) {
    outputByUniverse.push(
      calculateDmxForUniverse(state, splitStates, timeState, universeIndex)
    )
  }

  return outputByUniverse
}
