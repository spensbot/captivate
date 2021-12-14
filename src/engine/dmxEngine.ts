import * as dmxConnection from './dmxConnection'
import { Window, Window2D_t } from '../types/baseTypes'
import { Params } from './params'
import { Colors, getColors } from './dmxColors'
import { DmxValue, DMX_MAX_VALUE, FixtureChannel, ChannelType, DMX_DEFAULT_VALUE, channelTypes } from './dmxFixtures'
import { DmxState } from '../redux/dmxSlice'
import { RealtimeStore, RealtimeState } from '../redux/realtimeStore'
import { ReduxStore, ReduxState } from '../redux/store'
import { setDmx } from '../redux/connectionsSlice'
import { Point } from '../engine/randomizer'
import { lerp } from '../util/helpers'
 
let _realtimeStore: RealtimeStore
let _store: ReduxStore

function connectionStatusUpdate(isConnected: boolean, path: string | null) {
  if (_store.getState().connections.dmx.isConnected != isConnected) {
    _store.dispatch(setDmx({
      isConnected: isConnected,
      path: path ?? undefined,
      isTroubleshoot: false
    }));
  }
}

export function init(store: ReduxStore, realtimeStore: RealtimeStore) {
  _realtimeStore = realtimeStore
  _store = store
  dmxConnection.init(connectionStatusUpdate)
  setInterval(writeDMX, 1000 / 40)
}

const writeDMX = () => {  
  setDMX(_store.getState(), _realtimeStore.getState())
}

function getWindowMultiplier2D(fixtureWindow: Window2D_t, movingWindow: Window2D_t) {
  return getWindowMultiplier(fixtureWindow.x, movingWindow.x) * getWindowMultiplier(fixtureWindow.y, movingWindow.y)
}

function getWindowMultiplier(fixtureWindow?: Window, movingWindow?: Window) {
  if (fixtureWindow && movingWindow) {
    const distanceBetween = Math.abs(fixtureWindow.pos - movingWindow.pos) / 2
    const reach = fixtureWindow.width / 2 + movingWindow.width / 2
    return distanceBetween > reach ? 0.0 : 1.0 - distanceBetween / reach;
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

function getDmxValue(master: number, fixtureChannel: FixtureChannel, params: Params, colors: Colors, fixtureWindow: Window2D_t, movingWindow: Window2D_t): DmxValue {
  switch (fixtureChannel.type) {
    case 'master':
      return params.Brightness * DMX_MAX_VALUE * getWindowMultiplier2D(fixtureWindow, movingWindow) * master;
    case 'other':
      return fixtureChannel.default;
    case 'color':
      return colors[fixtureChannel.color] * DMX_MAX_VALUE
    case 'strobe':
      return (params.Strobe > 0.5) ? fixtureChannel.default_strobe : fixtureChannel.default_solid
    default:
      return 0
  }
}

function getMovingWindow(params: Params): Window2D_t {
  return {
    x: {pos: params.X, width: params.Width},
    y: {pos: params.Y, width: params.Height}
  }
}

function applyRandomization(value: number, point: Point, randomizationAmount: number) {
  return lerp(value, value * point.level, randomizationAmount)
}

export default function setDMX(_s: ReduxState, _rs: RealtimeState) {
  const universe = _s.dmx.universe
  const fixtureTypes = _s.dmx.fixtureTypesByID

  if (_s.gui.blackout) {

    for (let channel = 1; channel < 513; channel++) {
      dmxConnection.updateChannel(channel, DMX_DEFAULT_VALUE)
    }

  } else {

    const colors = getColors(_rs.outputParams);
    const movingWindow = getMovingWindow(_rs.outputParams);
  
    universe.forEach((fixture, i) => {
      const fixtureType = fixtureTypes[fixture.type]
      
      fixtureType.channels.forEach((channel, offset) => {
        const outputChannel = fixture.ch + offset
        const overwrite = _s.mixer.overwrites[outputChannel - 1]
        if (overwrite !== undefined) {
          dmxConnection.updateChannel(outputChannel, overwrite * DMX_MAX_VALUE)
        } else if (_rs.outputParams.Epicness >= fixtureType.epicness) {
          let dmxOut = getDmxValue(_s.scenes.master, channel, _rs.outputParams, colors, fixture.window, movingWindow)
          if (channel.type === 'master') {
            dmxOut = applyRandomization(dmxOut, _rs.randomizer[i], _rs.outputParams.Randomize)
          }
          dmxConnection.updateChannel(outputChannel, dmxOut)
        } else {
          dmxConnection.updateChannel(outputChannel, DMX_DEFAULT_VALUE)
        }
      })

      if (_rs.outputParams.Epicness >= fixtureType.epicness) {
        fixtureType.channels.forEach((channel, offset) => {
          let dmxOut = getDmxValue(_s.scenes.master, channel, _rs.outputParams, colors, fixture.window, movingWindow)
          dmxOut = applyRandomization(dmxOut, _rs.randomizer[i], _rs.outputParams.Randomize)
          dmxConnection.updateChannel(fixture.ch + offset, dmxOut)
        })
      } else {
        fixtureType.channels.forEach((channel, offset) => {
          dmxConnection.updateChannel(fixture.ch + offset, DMX_DEFAULT_VALUE)
        })
      }
    })
  }
}