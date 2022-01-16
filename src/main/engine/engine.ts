import * as DmxConnection from './dmxConnection'
import * as MidiConnection from './midiConnection'
import NodeLink from 'node-link'
import { ipcSetup } from './ipcHandler'
import { WebContents } from 'electron'
import { ReduxState } from '../../renderer/redux/store'
import {
  RealtimeState,
  initRealtimeState,
} from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../engine/TimeState'
import { Params } from '../../engine/params'
import { lerp } from '../../util/util'
import {
  syncAndUpdate,
  Point,
  initRandomizerState,
  RandomizerState,
} from '../../engine/randomizer'
import { modulateParams } from '../../engine/modulation'
import { Colors, getColors } from '../../engine/dmxColors'
import { Window, Window2D_t } from '../../types/baseTypes'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  DMX_DEFAULT_VALUE,
} from '../../engine/dmxFixtures'

let _nodeLink = new NodeLink()
let _ipcCallbacks: ReturnType<typeof ipcSetup> | null = null
let _controlState: ReduxState | null = null
let _lastFrameTime = 0
let _lastRandomizerState = initRandomizerState()

export function start(renderer: WebContents) {
  _ipcCallbacks = ipcSetup({
    renderer: renderer,
    on_new_control_state: (newState) => {
      _controlState = newState
    },
  })
}

DmxConnection.maintain({
  update_ms: 5000,
  onUpdate: (path) => {
    if (_ipcCallbacks !== null) _ipcCallbacks.send_dmx_connection_update(path)
  },
  calculateChannels: () => {
    let realtimeState = calculateRealtimeState()
    if (_ipcCallbacks !== null) _ipcCallbacks.send_time_state(realtimeState)
    return realtimeState.dmxOut
  },
})

MidiConnection.maintain({
  update_ms: 5000,
  onUpdate: (activeDevices) => {
    if (_ipcCallbacks !== null)
      _ipcCallbacks.send_midi_connection_update(activeDevices)
  },
  onMessage: (message) => {
    if (_ipcCallbacks !== null) _ipcCallbacks.send_midi_message(message)
  },
})

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
  master: number,
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
        getWindowMultiplier2D(fixtureWindow, movingWindow) *
        master
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
}

function calculateDmx(
  _s: ReduxState,
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
          channels[outputChannel] = overwrite * DMX_MAX_VALUE
        } else if (outputParams.epicness >= fixtureType.epicness) {
          let dmxOut = getDmxValue(
            _s.scenes.master,
            channel,
            outputParams,
            colors,
            fixture.window,
            movingWindow
          )
          if (channel.type === 'master') {
            dmxOut = applyRandomization(
              dmxOut,
              randomizerState[i],
              outputParams.randomize
            )
          }
          channels[outputChannel] = dmxOut
        } else {
          channels[outputChannel] = DMX_DEFAULT_VALUE
        }
      })
    })
  }

  return channels
}

function calculateRealtimeState(): RealtimeState {
  let currentTime = Date.now()
  const dt = currentTime - _lastFrameTime

  if (dt < 10 || _ipcCallbacks === null || _controlState === null) {
    let rs = initRealtimeState()
    return rs
  }

  _lastFrameTime = currentTime

  const timeState: TimeState = _nodeLink.getSessionInfoCurrent()
  timeState.dt = dt
  timeState.quantum = 4.0

  if (
    _controlState.scenes.active &&
    _controlState.scenes.byId[_controlState.scenes.active]
  ) {
    const scene = _controlState.scenes.byId[_controlState.scenes.active]

    const outputParams = modulateParams(timeState.beats, scene)

    // Todo: (Spenser)
    // handleAutoScene(_store, newRealtimeState.time)

    _lastRandomizerState = syncAndUpdate(
      _lastRandomizerState,
      _controlState.dmx.universe,
      timeState,
      scene.randomizer
    )

    return {
      outputParams: outputParams,
      time: timeState,
      randomizer: _lastRandomizerState,
      dmxOut: calculateDmx(_controlState, outputParams, _lastRandomizerState),
    }
  } else {
    return initRealtimeState()
  }
}
