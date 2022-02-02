import { Colors, getColors } from '../../shared/dmxColors'
import { Window, Window2D_t } from '../../types/baseTypes'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  DMX_DEFAULT_VALUE,
} from '../../shared/dmxFixtures'
import { Params } from '../../shared/params'
import { lerp } from '../../shared/util'
import { Point, RandomizerState } from '../../shared/randomizer'
import { CleanReduxState } from '../../renderer/redux/store'

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
  // return value
}

export function calculateDmx(
  _s: CleanReduxState,
  outputParams: Params,
  randomizerState: RandomizerState
): number[] {
  const universe = _s.dmx.universe
  const fixtureTypes = _s.dmx.fixtureTypesByID

  let channels = Array(512).fill(0)

  if (!_s.gui.blackout) {
    const colors = getColors(outputParams)
    const movingWindow = getMovingWindow(outputParams)

    universe.forEach((fixture, i) => {
      const fixtureType = fixtureTypes[fixture.type]

      fixtureType.channels.forEach((channel, offset) => {
        const outputChannel = fixture.ch + offset
        const overwrite = _s.mixer.overwrites[outputChannel - 1]
        if (overwrite !== undefined) {
          channels[outputChannel - 1] = overwrite * DMX_MAX_VALUE
        } else if (outputParams.epicness >= fixtureType.epicness) {
          let dmxOut = getDmxValue(
            channel,
            outputParams,
            colors,
            fixture.window,
            movingWindow
          )
          if (channel.type === 'master') {
            dmxOut =
              applyRandomization(
                dmxOut,
                randomizerState[i],
                outputParams.randomize
              ) * _s.control.master
          }
          channels[outputChannel - 1] = dmxOut
        } else {
          channels[outputChannel - 1] = DMX_DEFAULT_VALUE
        }
      })
    })
  }

  return channels
}
