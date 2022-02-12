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
import { TimeState } from '../../shared/TimeState'
import { syncAndUpdate } from '../../shared/randomizer'
import { modulateParams } from '../../shared/modulation'
import { handleMessage } from './handleMidi'
import openVisualizerWindow, {
  VisualizerContainer,
} from './createVisualizerWindow'
import { calculateDmx } from './dmxUtil'
import { handleAutoScene } from '../../shared/autoScene'
import { setActiveScene } from '../../renderer/redux/controlSlice'

let _nodeLink = new NodeLink()
let _ipcCallbacks: ReturnType<typeof ipcSetup> | null = null
let _controlState: CleanReduxState | null = null
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

  // We're currently calculating the realtimeState 90x per second.
  // The renderer should have a new realtime state to on each animation frame (assuming a refresh rate of 60 hz)
  setInterval(() => {
    _realtimeState = calculateRealtimeState()
    if (_ipcCallbacks !== null) {
      _ipcCallbacks.send_time_state(_realtimeState)
      if (_controlState !== null) {
        _ipcCallbacks.send_visualizer_state({
          rt: _realtimeState,
          state: _controlState,
        })
      }
    }
  }, 1000 / 90)
}

export function stop() {
  _ipcCallbacks = null
}

DmxConnection.maintain({
  update_ms: 1000,
  onUpdate: (path) => {
    if (_ipcCallbacks !== null) _ipcCallbacks.send_dmx_connection_update(path)
  },
  getChannels: () => _realtimeState.dmxOut,
  getConnectable: () => {
    return _controlState ? _controlState.control.device.connectTo.midi : []
  },
})

MidiConnection.maintain({
  update_ms: 1000,
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
  getConnectable: () => {
    return _controlState ? _controlState.control.device.connectTo.midi : []
  },
})

function calculateRealtimeState(): RealtimeState {
  let currentTime = Date.now()
  const dt = currentTime - _lastFrameTime

  if (dt < 10 || _ipcCallbacks === null || _controlState === null) {
    let rs = initRealtimeState()
    return rs
  }

  _lastFrameTime = currentTime

  //@ts-ignore: I don't know how to convince typescript that I flesh out timeState in the following 2 lines
  const timeState: TimeState = _nodeLink.getSessionInfoCurrent()
  timeState.dt = dt
  timeState.quantum = 4.0

  const scene =
    _controlState.control.light.byId[_controlState.control.light.active]
  if (scene) {
    const outputParams = modulateParams(timeState.beats, scene)

    const newRandomizerState = syncAndUpdate(
      _realtimeState.time.beats,
      _realtimeState.randomizer,
      _controlState.dmx.universe.length,
      timeState,
      scene.randomizer
    )

    handleAutoScene(
      _realtimeState,
      timeState,
      _controlState,
      (newLightScene) => {
        if (_ipcCallbacks)
          _ipcCallbacks.send_dispatch(
            setActiveScene({
              sceneType: 'light',
              val: newLightScene,
            })
          )
      },
      (newVisualScene) => {
        if (_ipcCallbacks)
          _ipcCallbacks.send_dispatch(
            setActiveScene({
              sceneType: 'visual',
              val: newVisualScene,
            })
          )
      }
    )

    return {
      outputParams: outputParams,
      time: timeState,
      randomizer: newRandomizerState,
      dmxOut: calculateDmx(_controlState, outputParams, newRandomizerState),
    }
  } else {
    return initRealtimeState()
  }
}
