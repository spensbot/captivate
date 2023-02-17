import {
  DMX_MAX_VALUE,
  DMX_DEFAULT_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
} from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getDmxValue,
  getFixturesInGroups,
  flatten_fixtures,
} from '../../shared/dmxUtil'
import { indexArray } from '../../shared/util'
import { TimeState } from '../../shared/TimeState'

export function calculateDmx(
  state: CleanReduxState,
  randomizerState: RandomizerState,
  splitScenes: { outputParams: Params }[],
  timeState: TimeState
): number[] {
  const universe = state.dmx.universe
  const fixtures = flatten_fixtures(universe, state.dmx.fixtureTypesByID)

  let channels = Array(DMX_NUM_CHANNELS).fill(0)

  if (timeState.isPlaying) {
    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]

    const applyFixtures = (
      _fixtures: FlattenedFixture[],
      _outputParams: Params,
      _randomizerState: RandomizerState
    ) => {
      _fixtures.forEach((fixture) => {
        fixture.channels.forEach(([outputChannel, channelType]) => {
          let new_channel_value = DMX_DEFAULT_VALUE
          let current_channel_value = channels[outputChannel - 1]
          if (
            _outputParams.intensity !== undefined &&
            _outputParams.intensity >= fixture.intensity
          ) {
            new_channel_value = getDmxValue(
              channelType,
              _outputParams,
              fixture,
              state.control.master,
              // TODO: Fix randomizer now that we have subfixtures
              1.0 // _randomizerState[universeIndex].level
            )
          }
          channels[outputChannel - 1] = Math.max(
            new_channel_value,
            current_channel_value
          )
        })
      })
    }

    splitScenes.forEach((split, i) => {
      const splitGroups = activeScene.splitScenes[i]?.groups ?? []

      const splitSceneFixtures = getFixturesInGroups(fixtures, splitGroups)

      applyFixtures(splitSceneFixtures, split.outputParams, randomizerState)
    })

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
