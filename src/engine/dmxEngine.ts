import * as dmxConnection from './dmxConnection'
import { Window, Window2D } from './baseTypes'
import { Params } from './params'
import { Colors, getColors } from './dmxColors'
import { DmxValue, DMX_MAX_VALUE, FixtureChannel, ChannelType, Fixture, DMX_DEFAULT_VALUE} from './dmxFixtures'

export function init() {
  dmxConnection.maintainConnection()

  writeDMX(0)
}

const skewDMX = (value: number, max: number, power: number) => {
  value /= max
  value = Math.pow(value, power)
  return value * max
}

// Power values > 1 skew 
const skew = (value: number, power: number) => {
  return Math.pow(value, power)
}

const writeDMX = (value: number) => {
  value += 0.01
  if (value > 1) value -= 1

  const dmxValue = skew(value, 2) * DMX_MAX_VALUE
  
  dmxConnection.updateChannel(1, dmxValue)
  dmxConnection.updateChannel(3, dmxValue)

  setTimeout(() => writeDMX(value), 200)
}

function getWindowMultiplier2D(fixtureWindow?: Window2D, movingWindow?: Window2D) {
  if (fixtureWindow && movingWindow) {
    return getWindowMultiplier(fixtureWindow.x, movingWindow.x) * getWindowMultiplier(fixtureWindow.y, movingWindow.y)
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

function getWindowMultiplier(fixtureWindow?: Window, movingWindow?: Window) {
  if (fixtureWindow && movingWindow) {
    const distanceBetween = Math.abs(fixtureWindow.pos - movingWindow.pos)
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
      return colors[fixtureChannel.color]
    case ChannelType.StrobeSpeed:
      return params.Strobe ? fixtureChannel.default_strobe : fixtureChannel.default_solid
  }
}

function getMovingWindow(params: Params): Window2D {
  return {
    x: {pos: params.X, width: params.X_Width},
    y: {pos: params.Y, width: params.Y_Width}
  }
}

export default function getDMX(params: Params, fixtures: Fixture[]): DmxValue[] {

  if (params.Blackout > 0.5) {
    fixtures.forEach(fixture => {
      fixture.type.channels.forEach( (channel, offset) => {
        dmxConnection.update(fixture.channelNum + offset, DMX_DEFAULT_VALUE)
      })
    })
  }

  const colors = getColors(params);
  const movingWindow = getMovingWindow(params);

  fixtures.forEach(fixture => {
    fixture.type.channels.forEach( (channel, offset) => {
      dmxSend[fixture.channelNum + offset] = getDmxValue(channel, params, colors, fixture.window, movingWindow)
    })
  })

  return dmxSend
}