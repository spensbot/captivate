import { WebContents } from 'electron'
import * as DmxConnection from './dmxConnection'
import * as MidiConnection from './midiConnection'
import NodeLink from 'node-link'
import { ipcSetup } from './ipcHandler'
import { CleanReduxState } from '../../renderer/redux/store'
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
import { handleMessage } from './handleMidi'
import openVisualizerWindow, {
  VisualizerContainer,
} from './createVisualizerWindow'

let _nodeLink = new NodeLink()
let _ipcCallbacks: ReturnType<typeof ipcSetup> | null = null
let _controlState: CleanReduxState | null = null
let _lastRandomizerState = initRandomizerState()
let _realtimeState: RealtimeState = initRealtimeState()
let _lastFrameTime = 0

export function start(
  renderer: WebContents,
  visualizerContainer: VisualizerContainer
) {
  _ipcCallbacks = ipcSetup({
    renderer: renderer,
    visualizerContainer: visualizerContainer,
    on_new_control_state: (newState) => {
      _controlState = newState
    },
    on_user_command: (_command) => {},
    on_open_visualizer: () => {
      console.log('on_open_visualizer')
      openVisualizerWindow(visualizerContainer)
    },
  })
}

export function stop() {
  _ipcCallbacks = null
}

DmxConnection.maintain({
  update_ms: 5000,
  onUpdate: (path) => {
    if (_ipcCallbacks !== null) _ipcCallbacks.send_dmx_connection_update(path)
  },
  calculateChannels: () => {
    let _realtimeState = calculateRealtimeState()
    if (_ipcCallbacks !== null) {
      _ipcCallbacks.send_time_state(_realtimeState)
      if (_controlState !== null) {
        _ipcCallbacks.send_visualizer_state({
          rt: _realtimeState,
          state: _controlState,
        })
      }
    }
    return _realtimeState.dmxOut
  },
})

MidiConnection.maintain({
  update_ms: 5000,
  onUpdate: (activeDevices) => {
    if (_ipcCallbacks !== null)
      _ipcCallbacks.send_midi_connection_update(activeDevices)
  },
  onMessage: (message) => {
    if (_controlState !== null && _ipcCallbacks !== null) {
      handleMessage(
        message,
        _controlState,
        _realtimeState,
        _nodeLink,
        _ipcCallbacks.send_dispatch
      )
    }
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
  // return value
}

function calculateDmx(
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
            _s.control.master,
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
          channels[outputChannel - 1] = dmxOut
        } else {
          channels[outputChannel - 1] = DMX_DEFAULT_VALUE
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

  //@ts-ignore: I don't know how to tell typescript that I plan to flesh out timeState in the following 2 lines
  const timeState: TimeState = _nodeLink.getSessionInfoCurrent()
  timeState.dt = dt
  timeState.quantum = 4.0

  const scene =
    _controlState.control.light.byId[_controlState.control.light.active]
  if (scene) {
    const outputParams = modulateParams(timeState.beats, scene)

    // Todo: (Spenser)
    // handleAutoScene(_store, newRealtimeState.time)

    _lastRandomizerState = syncAndUpdate(
      _lastRandomizerState,
      _controlState.dmx.universe.length,
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
