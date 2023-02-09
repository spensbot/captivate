import {
  DMX_MAX_VALUE,
  DMX_DEFAULT_VALUE,
  DMX_NUM_CHANNELS,
} from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getDmxValue,
  getMainGroups,
  getFixturesInGroups,
  UniverseFixture,
  getSortedGroups,
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
  const fixtureTypes = state.dmx.fixtureTypesByID

  let channels = Array(DMX_NUM_CHANNELS).fill(0)

  if (timeState.isPlaying) {
    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]

    const applyFixtures = (
      fixtures: UniverseFixture[],
      _outputParams: Params,
      _randomizerState: RandomizerState
    ) => {
      fixtures.forEach(({ fixture, universeIndex }) => {
        const fixtureType = fixtureTypes[fixture.type]

        fixtureType.channels.forEach((channel, offset) => {
          const outputChannel = fixture.ch + offset
          if (
            _outputParams.intensity !== undefined &&
            _outputParams.intensity >= fixtureType.intensity
          ) {
            let dmxOut = getDmxValue(
              channel,
              _outputParams,
              fixture,
              state.control.master,
              _randomizerState[universeIndex].level
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
    const mainSceneFixtures = getFixturesInGroups(universe, mainGroups)

    applyFixtures(mainSceneFixtures, outputParams, randomizerState)

    splitScenes.forEach((split, i) => {
      const splitGroups = activeScene.splitScenes[i]?.groups ?? []

      const splitSceneFixtures = getFixturesInGroups(universe, splitGroups)

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
