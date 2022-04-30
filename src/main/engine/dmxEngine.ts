import { getColors } from '../../shared/dmxColors'
import { DMX_MAX_VALUE, DMX_DEFAULT_VALUE } from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getMovingWindow,
  getDmxValue,
  applyRandomization,
  getMainGroups,
  getFixturesInGroups,
  UniverseFixture,
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
      const colors = getColors(_outputParams)
      const movingWindow = getMovingWindow(_outputParams)

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
              colors,
              fixture,
              movingWindow
            )
            if (channel.type === 'master') {
              dmxOut =
                applyRandomization(
                  dmxOut,
                  _randomizerState[universeIndex],
                  _outputParams.randomize
                ) * state.control.master
            }
            channels[outputChannel - 1] = dmxOut
          } else {
            channels[outputChannel - 1] = DMX_DEFAULT_VALUE
          }
        })
      })
    }

    const mainGroups = getMainGroups(activeScene, state.dmx.groups)
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
