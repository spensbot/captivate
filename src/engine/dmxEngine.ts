import * as dmxConnection from './dmxConnection'
import { Window, Window2D } from '../types/baseTypes'
import { Params } from './params'
import { Color, Colors, getColors } from './dmxColors'
import { DmxValue, DMX_MAX_VALUE, FixtureChannel, ChannelType, Fixture, DMX_DEFAULT_VALUE, getTestUniverse} from './dmxFixtures'
import { RealtimeStore } from '../redux/realtimeStore'
import { ReduxStore } from '../redux/store'
import { setDmx } from '../redux/connectionsSlice'

let _realtimeStore: RealtimeStore
let _store: ReduxStore

function connectionStatusUpdate(isConnected: boolean, path: string | null) {
  if (_store.getState().connections.dmx.isConnected != isConnected) {
    _store.dispatch(setDmx({
      isConnected: isConnected,
      path: path,
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
  setDMX(_realtimeStore.getState().outputParams, getTestUniverse())
}

function getWindowMultiplier2D(fixtureWindow?: Window2D, movingWindow?: Window2D) {
  if (fixtureWindow && movingWindow) {
    return getWindowMultiplier(fixtureWindow.x, movingWindow.x) * getWindowMultiplier(fixtureWindow.y, movingWindow.y)
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

function getWindowMultiplier(fixtureWindow?: Window, movingWindow?: Window) {
  if (fixtureWindow && movingWindow) {
    const distanceBetween = Math.abs(fixtureWindow.pos - movingWindow.pos) / 2
    const reach = fixtureWindow.width / 2 + movingWindow.width / 2
    return distanceBetween > reach ? 0.0 : 1.0 - distanceBetween / reach;
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

function getDmxValue(fixtureChannel: FixtureChannel, params: Params, colors: Colors, fixtureWindow?: Window2D, movingWindow?: Window2D): DmxValue {
  switch (fixtureChannel.type) {
    case ChannelType.Master:
      return params.Brightness * DMX_MAX_VALUE * getWindowMultiplier2D(fixtureWindow, movingWindow);
    case ChannelType.Other:
      return fixtureChannel.default;
    case ChannelType.Color:
      return colors[fixtureChannel.color] * DMX_MAX_VALUE
    // case ChannelType.StrobeSpeed:
    //   return (params.Strobe > 0.5) ? fixtureChannel.default_strobe : fixtureChannel.default_solid
  }
}

function getMovingWindow(params: Params): Window2D {
  return {
    x: {pos: params.X, width: params.Width},
    y: {pos: params.Y, width: params.Height}
  }
}

export default function setDMX(params: Params, universe: Fixture[]) {
  const blackout = false

  const fixtureTypes = _store.getState().dmx.fixtureTypesByID

  if (blackout) {
    universe.forEach(fixture => {
      fixtureTypes[fixture.type].channels.forEach( (channel, offset) => {
        dmxConnection.updateChannel(fixture.ch + offset, DMX_DEFAULT_VALUE)
      })
    })
  }

  const colors = getColors(params);
  const movingWindow = getMovingWindow(params);

  universe.forEach(fixture => {
    fixtureTypes[fixture.type].channels.forEach((channel, offset) => {
      const dmxOut = getDmxValue(channel, params, colors, fixture.window, movingWindow)
      dmxConnection.updateChannel(fixture.ch + offset, dmxOut);
    })
  })
}