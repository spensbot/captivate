import { getColors } from '../../shared/dmxColors'
import {
  DMX_MAX_VALUE,
  DMX_DEFAULT_VALUE,
  Fixture,
} from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getMovingWindow,
  getDmxValue,
  applyRandomization,
  getAllSplitSceneGroups,
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
      fixtures: Fixture[],
      _outputParams: Params,
      _randomizerState: RandomizerState
    ) => {
      const colors = getColors(_outputParams)
      const movingWindow = getMovingWindow(_outputParams)

      fixtures.forEach((fixture, i) => {
        const fixtureType = fixtureTypes[fixture.type]

        fixtureType.channels.forEach((channel, offset) => {
          const outputChannel = fixture.ch + offset
          const overwrite = state.mixer.overwrites[outputChannel - 1]
          if (overwrite !== undefined) {
            channels[outputChannel - 1] = overwrite * DMX_MAX_VALUE
          } else if (_outputParams.epicness >= fixtureType.epicness) {
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
                  _randomizerState[i],
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

    const splitSceneGroups = getAllSplitSceneGroups(activeScene)

    const mainSceneFixtures = universe.filter((fixture) => {
      for (const group of fixture.groups) {
        if (splitSceneGroups.has(group)) return false
      }
      return true
    })

    applyFixtures(mainSceneFixtures, outputParams, randomizerState)

    splitScenes.forEach((split, i) => {
      const splitGroups = activeScene.splitScenes[i]?.groups
      if (splitGroups === undefined) return
      const splitGroupSet = new Set(splitGroups)
      const splitSceneFixtures = universe.filter((fixture) => {
        for (const group of fixture.groups) {
          if (splitGroupSet.has(group)) return true
        }
        return false
      })
      applyFixtures(splitSceneFixtures, split.outputParams, randomizerState)
    })
  }

  return channels
}
