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
  getMainGroups,
  getFixturesInGroups,
  getSortedGroups,
  flatten_fixtures,
} from '../../shared/dmxUtil'
import { indexArray } from '../../shared/util'
import { TimeState } from '../../shared/TimeState'

export function calculateDmx(
  state: CleanReduxState,
  outputParams: Params,
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
          if (
            _outputParams.intensity !== undefined &&
            _outputParams.intensity >= fixture.intensity
          ) {
            let dmxOut = getDmxValue(
              channelType,
              _outputParams,
              fixture,
              state.control.master,
              // TODO: Fix randomizer now that we have subfixtures
              1.0 // _randomizerState[universeIndex].level
            )
            channels[outputChannel - 1] = dmxOut
          } else {
            channels[outputChannel - 1] = DMX_DEFAULT_VALUE
          }
        })
      })
    }

    const groups = getSortedGroups(state.dmx.universe)

    const mainGroups = getMainGroups(activeScene, groups)
    const mainSceneFixtures = getFixturesInGroups(fixtures, mainGroups)

    applyFixtures(mainSceneFixtures, outputParams, randomizerState)

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
