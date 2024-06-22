import {
  DMX_MAX_VALUE,
  DMX_NUM_CHANNELS,
} from '../../shared/dmxFixtures'
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

export function calculateDmx(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState
): number[] {
  const universe = state.dmx.universe
  const all_fixtures = flatten_fixtures(universe, state.dmx.fixtureTypesByID)

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
      forEachChannel(splitSceneFixtures, (fixtureIdx, fixture, channelIdx, channel) => {
        const randomizerLevel = randomizer[fixtureIdx]?.level ?? 1
        channels[channelIdx] = getDmxValue(channel, outputParams, fixture, state.control.master, randomizerLevel)
      })
    }

    // Apply any overwrites
    indexArray(DMX_NUM_CHANNELS).forEach((i) => {
      const overwrite = state.mixer.overwrites[i]
      if (overwrite !== undefined) {
        channels[i] = overwrite * DMX_MAX_VALUE
      }
    })
  }

  return channels
}
