import { WebContents } from 'electron'
import * as DmxConnection from './dmxConnection'
import * as MidiConnection from './midiConnection'
import NodeLink from 'node-link'
import { ipcSetup, IPC_Callbacks } from './ipcHandler'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  RealtimeState,
  initRealtimeState,
} from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../shared/TimeState'
import { syncAndUpdate } from '../../shared/randomizer'
import { getOutputParams } from '../../shared/modulation'
import { handleMessage } from './handleMidi'
import openVisualizerWindow, {
  VisualizerContainer,
} from './createVisualizerWindow'
import { calculateDmx } from './dmxEngine'
import { handleAutoScene } from '../../shared/autoScene'
import { setActiveScene } from '../../renderer/redux/controlSlice'
import TapTempoEngine from './TapTempoEngine'
import { mapUndefinedParamsToDefault } from '../../shared/params'

let _nodeLink = new NodeLink()
let _ipcCallbacks: IPC_Callbacks | null = null
let _controlState: CleanReduxState | null = null
let _realtimeState: RealtimeState = initRealtimeState()
let _lastFrameTime = 0
const _tapTempoEngine = new TapTempoEngine()
function _tapTempo() {
  _tapTempoEngine.tap(_realtimeState.time.bpm, (newBpm) => {
    _nodeLink.setTempo(newBpm)
  })
}

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
    on_user_command: (command) => {
      if (command.type === 'IncrementTempo') {
        _nodeLink.setTempo(_realtimeState.time.bpm + command.amount)
      } else if (command.type === 'SetLinkEnabled') {
        _nodeLink.enable(command.isEnabled)
      } else if (command.type === 'EnableStartStopSync') {
        _nodeLink.enableStartStopSync(command.isEnabled)
      } else if (command.type === 'SetIsPlaying') {
        _nodeLink.setIsPlaying(command.isPlaying)
      } else if (command.type === 'SetBPM') {
        _nodeLink.setTempo(command.bpm)
      } else if (command.type === 'TapTempo') {
        _tapTempo()
      }
    },
    on_open_visualizer: () => {
      console.log('on_open_visualizer')
      openVisualizerWindow(visualizerContainer)
    },
  })

  // We're currently calculating the realtimeState 90x per second.
  // The renderer should have a new realtime state on each animation frame (assuming a refresh rate of 60 hz)
  setInterval(() => {
    const nextTimeState = getNextTimeState()
    if (
      (nextTimeState.isPlaying || _realtimeState.time.isPlaying) &&
      _ipcCallbacks !== null &&
      _controlState !== null
    ) {
      _realtimeState = getNextRealtimeState(
        _realtimeState,
        nextTimeState,
        _ipcCallbacks,
        _controlState
      )
      _ipcCallbacks.send_time_state(_realtimeState)
      _ipcCallbacks.send_visualizer_state({
        rt: _realtimeState,
        state: _controlState,
      })
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
    return _controlState ? _controlState.control.device.connectable.dmx : []
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
        _ipcCallbacks.send_dispatch,
        _tapTempo
      )
    }
  },
  getConnectable: () => {
    return _controlState ? _controlState.control.device.connectable.midi : []
  },
})

// Todo: Desimate dt in this context
function getNextTimeState(): TimeState {
  let currentTime = Date.now()
  const dt = currentTime - _lastFrameTime

  _lastFrameTime = currentTime

  return {
    ..._nodeLink.getSessionInfoCurrent(),
    dt: dt,
    quantum: 4.0,
  }
}

function getNextRealtimeState(
  realtimeState: RealtimeState,
  nextTimeState: TimeState,
  ipcCallbacks: IPC_Callbacks,
  controlState: CleanReduxState
): RealtimeState {
  const scene =
    controlState.control.light.byId[controlState.control.light.active]

  const newRandomizerState = syncAndUpdate(
    realtimeState.time.beats,
    realtimeState.randomizer,
    controlState.dmx.universe.length,
    nextTimeState,
    scene.randomizer
  )

  handleAutoScene(
    realtimeState,
    nextTimeState,
    controlState,
    (newLightScene) => {
      ipcCallbacks.send_dispatch(
        setActiveScene({
          sceneType: 'light',
          val: newLightScene,
        })
      )
    },
    (newVisualScene) => {
      ipcCallbacks.send_dispatch(
        setActiveScene({
          sceneType: 'visual',
          val: newVisualScene,
        })
      )
    }
  )

  const outputParams = getOutputParams(nextTimeState.beats, scene, null)

  const splitScenes = scene.splitScenes.map((_split, splitIndex) => {
    return {
      outputParams: getOutputParams(nextTimeState.beats, scene, splitIndex),
    }
  })

  return {
    outputParams,
    time: nextTimeState,
    randomizer: newRandomizerState,
    dmxOut: calculateDmx(
      controlState,
      outputParams,
      newRandomizerState,
      splitScenes
    ),
    splitScenes,
  }
}
