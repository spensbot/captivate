import {
  DMX_MAX_VALUE,
  DMX_DEFAULT_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
} from '../shared/dmxFixtures'
import { Params } from '../shared/params'
import { RandomizerState } from '../../../shared/randomizer'
import { CleanReduxState } from '../../../renderer/redux/store'
import {
  getDmxValue,
  getFixturesInGroups,
  flatten_fixtures,
} from '../shared/dmxUtil'
import { indexArray, zip } from '../../../shared/util'
import { TimeState } from '../../bpm/shared/TimeState'
import { SplitState } from 'renderer/redux/realtimeStore'

export function calculateDmx(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState
): number[] {
  const universe = state.dmx.universe
  const all_fixtures = flatten_fixtures(universe, state.dmx.fixtureTypesByID)

  let channels = Array(DMX_NUM_CHANNELS).fill(0)

  if (timeState.isPlaying) {
    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]

    const applyFixtures = (
      fixtures: FlattenedFixture[],
      outputParams: Params,
      randomizerState: RandomizerState
    ) => {
      fixtures.forEach((fixture, i) => {
        fixture.channels.forEach(([outputChannel, channelType]) => {
          let new_channel_value = DMX_DEFAULT_VALUE
          let current_channel_value = channels[outputChannel - 1]
          if (fixture.intensity <= (outputParams.intensity ?? 1)) {
            new_channel_value = getDmxValue(
              channelType,
              outputParams,
              fixture,
              state.control.master,
              randomizerState[i]?.level ?? 1
            )
          }
          channels[outputChannel - 1] = Math.max(
            new_channel_value,
            current_channel_value
          )
        })
      })
    }

    for (const [{ outputParams, randomizer }, splitScene] of zip(
      splitStates,
      activeScene.splitScenes
    )) {
      const splitGroups = splitScene.groups

      const splitSceneFixtures = getFixturesInGroups(all_fixtures, splitGroups)

      applyFixtures(splitSceneFixtures, outputParams, randomizer)
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
