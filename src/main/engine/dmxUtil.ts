import { Colors, getColors } from '../../shared/dmxColors'
import { Window, Window2D_t } from '../../types/baseTypes'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  DMX_DEFAULT_VALUE,
  Fixture,
} from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { lerp } from '../../shared/util'
import { Point, RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'
import { LightScene_t } from 'shared/Scenes'

function getWindowMultiplier2D(
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
) {
  return (
    getWindowMultiplier(fixtureWindow.x, movingWindow.x) *
    getWindowMultiplier(fixtureWindow.y, movingWindow.y)
  )
}

function getWindowMultiplier(fixtureWindow?: Window, movingWindow?: Window) {
  if (fixtureWindow && movingWindow) {
    const distanceBetween = Math.abs(fixtureWindow.pos - movingWindow.pos) / 2
    const reach = fixtureWindow.width / 2 + movingWindow.width / 2
    return distanceBetween > reach ? 0.0 : 1.0 - distanceBetween / reach
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

function getDmxValue(
  fixtureChannel: FixtureChannel,
  params: Params,
  colors: Colors,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): DmxValue {
  switch (fixtureChannel.type) {
    case 'master':
      return (
        params.brightness *
        DMX_MAX_VALUE *
        getWindowMultiplier2D(fixtureWindow, movingWindow)
      )
    case 'other':
      return fixtureChannel.default
    case 'color':
      return colors[fixtureChannel.color] * DMX_MAX_VALUE
    case 'strobe':
      return params.strobe > 0.5
        ? fixtureChannel.default_strobe
        : fixtureChannel.default_solid
    case 'axis':
      const { min, max, dir } = fixtureChannel
      const range = max - min
      if (dir === 'x') {
        return min + params.xAxis * range
      } else if (dir === 'y') {
        return min + params.yAxis * range
      } else {
        console.error('Unhandled axis dir')
        return 0
      }
    case 'colorMap':
      return 0
    default:
      return 0
  }
}

function getMovingWindow(params: Params): Window2D_t {
  return {
    x: { pos: params.x, width: params.width },
    y: { pos: params.y, width: params.height },
  }
}

function applyRandomization(
  value: number,
  point: Point,
  randomizationAmount: number
) {
  return lerp(value, value * point.level, randomizationAmount)
}

function getSplitSceneGroups(activeScene: LightScene_t) {
  return activeScene.splitScenes.reduce<Set<string>>((accum, splitScene) => {
    for (const group of splitScene.groups) {
      accum.add(group)
    }
    return accum
  }, new Set())
}

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

    const applyFixtures = (fixtures: Fixture[], _outputParams: Params) => {
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
              fixture.window,
              movingWindow
            )
            if (channel.type === 'master') {
              dmxOut =
                applyRandomization(
                  dmxOut,
                  randomizerState[i],
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

    const splitSceneGroups = getSplitSceneGroups(activeScene)

    const mainSceneFixtures = universe.filter((fixture) => {
      for (const group of fixture.groups) {
        if (splitSceneGroups.has(group)) return false
      }
      return true
    })

    applyFixtures(mainSceneFixtures, outputParams)

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
      applyFixtures(splitSceneFixtures, split.outputParams)
    })

    console.log(`mainSceneFixtures.length = `, mainSceneFixtures.length)
  }

  return channels
}
