import * as dmxConnection from './dmxConnection'
import { Window, Window2D_t } from '../types/baseTypes'
import { Params } from './params'
import { Colors, getColors } from './dmxColors'
import { DmxValue, DMX_MAX_VALUE, FixtureChannel, ChannelType, DMX_DEFAULT_VALUE, channelTypes } from './dmxFixtures'
import { DmxState } from '../redux/dmxSlice'
import { RealtimeStore } from '../redux/realtimeStore'
import { ReduxStore } from '../redux/store'
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
  setDMX(_realtimeStore.getState().outputParams, _store.getState().dmx, _store.getState().gui.blackout, _realtimeStore.getState().randomizer)
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

function getDmxValue(fixtureChannel: FixtureChannel, params: Params, colors: Colors, fixtureWindow: Window2D_t, movingWindow: Window2D_t): DmxValue {
  switch (fixtureChannel.type) {
    case ChannelType.Master:
      return params.Brightness * DMX_MAX_VALUE * getWindowMultiplier2D(fixtureWindow, movingWindow);
    case ChannelType.Other:
      return fixtureChannel.default;
    case ChannelType.Color:
      return colors[fixtureChannel.color] * DMX_MAX_VALUE
    case ChannelType.Strobe:
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

export default function setDMX(params: Params, dmxState: DmxState, blackout: boolean, randomizerState: Point[]) {
  const universe = dmxState.universe
  const fixtureTypes = dmxState.fixtureTypesByID

  if (blackout) {

    for (let channel = 1; channel < 513; channel++) {
      dmxConnection.updateChannel(channel, DMX_DEFAULT_VALUE)
    }

  } else {

    const colors = getColors(params);
    const movingWindow = getMovingWindow(params);
  
    universe.forEach((fixture, i) => {
      const fixtureType = fixtureTypes[fixture.type]

      if (params.Epicness >= fixtureType.epicness) {
        fixtureType.channels.forEach((channel, offset) => {
          const dmxOut = getDmxValue(channel, params, colors, fixture.window, movingWindow)
          const dmxOutRandomized = applyRandomization(dmxOut, randomizerState[i], params.Randomize)
          dmxConnection.updateChannel(fixture.ch + offset, dmxOutRandomized);
        })
      } else {
        fixtureType.channels.forEach((channel, offset) => {
          dmxConnection.updateChannel(fixture.ch + offset, DMX_DEFAULT_VALUE)
        })
      }
    })
  }
}