import { DMX_MAX_VALUE, DMX_DEFAULT_VALUE } from '../../shared/dmxFixtures'
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

export function calculateDmx(
  state: CleanReduxState,
  outputParams: Params,
  randomizerState: RandomizerState,
  splitScenes: { outputParams: Params }[]
): number[] {
  const universe = state.dmx.universe
  const fixtureTypes = state.dmx.fixtureTypesByID

  let channels = Array(512).fill(0)

  if (!state.gui.blackout) {
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
          const overwrite = state.mixer.overwrites[outputChannel - 1]
          if (overwrite !== undefined) {
            channels[outputChannel - 1] = overwrite * DMX_MAX_VALUE
          } else if (_outputParams.intensity >= fixtureType.intensity) {
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
  }

  return channels
}
