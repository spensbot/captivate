import { WebContents, ipcMain } from 'electron'
import * as DmxConnection from 'features/dmx/engine/dmxConnection'
import * as MidiConnection from 'features/midi/engine/midiConnection'

import { CleanReduxState } from '../../renderer/redux/store'
import {
  RealtimeState,
  initRealtimeState,
  SplitState,
} from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../features/bpm/shared/TimeState'
import {
  initRandomizerState,
  resizeRandomizer,
  updateIndexes,
} from '../../features/bpm/shared/randomizer'
import { getOutputParams } from '../../features/modulation/shared/modulation'
import { handleMessage } from 'features/midi/engine/handleMidi'
import { VisualizerContainer } from '../../features/visualizer/engine/createVisualizerWindow'
import { calculateDmx } from 'features/dmx/engine/dmxEngine'
import { handleAutoScene } from '../../features/scenes/engine/autoScene'
import { setActiveScene } from '../../renderer/redux/controlSlice'
import {
  flatten_fixtures,
  getFixturesInGroups,
} from '../../features/dmx/shared/dmxUtil'
import { ThrottleMap } from 'features/midi/engine/midiConnection'
import { MidiMessage, midiInputID } from 'features/midi/shared/midi'
import { getAllParamKeys } from '../../features/dmx/redux/dmxSlice'
import { indexArray } from '../../features/utils/util'
import WledManager from '../../features/led/engine/wled_manager'
import {
  getNextTimeState,
  _nodeLink,
  _tapTempo,
} from 'features/bpm/engine/Link'
import { createApi, IPC_Callbacks } from './api'
let _ipcCallbacks: IPC_Callbacks | null = null
// let _controlState: CleanReduxState | null = null
let _realtimeState: RealtimeState = initRealtimeState()

// TODO: this should live in control state feature
const controlStateManager = () => {
  let _controlState: CleanReduxState | null = null
  let resolveFirstState: () => void
  const firstControlState = new Promise<void>((resolve) => {
    resolveFirstState = resolve
  })
  return {
    set(state: CleanReduxState) {
      if (!_controlState) resolveFirstState()
      _controlState = state
    },

    waitForFirstControlState: firstControlState,

    get() {
      return _controlState
    },
  }
}

const controlState = controlStateManager()

const _midiThrottle = new ThrottleMap((message: MidiMessage) => {
  // TODO: maybe we could cancel the throttle on close and initialize throttle after callbacks and control state are initialized
  // to avoid null checks
  if (controlState.get() !== null && _ipcCallbacks !== null) {
    handleMessage(
      message,
      controlState.get(),
      _realtimeState,
      _nodeLink,
      _ipcCallbacks.publishers.dispatch,
      _tapTempo
    )
  }
}, 1000 / 60)

export function getIpcCallbacks() {
  return _ipcCallbacks
}

export function start(
  renderer: WebContents,
  visualizerContainer: VisualizerContainer
) {
  _ipcCallbacks = createApi({
    ipcMain,
    realtimeState: _realtimeState,
    new_control_state: (newState) => {
      controlState.set(newState)
    },
    renderer,
    visualizerContainer,
  })

  // TODO: now we don't need null checks for control state
  controlState.waitForFirstControlState.then(() => {
    // We're currently calculating the realtimeState 90x per second.
    // The renderer should have a new realtime state on each animation frame (assuming a refresh rate of 60 hz)
    setInterval(() => {
      const nextTimeState = getNextTimeState()
      if (_ipcCallbacks !== null && controlState.get() !== null) {
        _realtimeState = getNextRealtimeState(
          _realtimeState,
          nextTimeState,
          _ipcCallbacks,
          controlState.get()
        )
        _ipcCallbacks.publishers.new_time_state(_realtimeState)
        _ipcCallbacks.publishers.new_visualizer_state({
          rt: _realtimeState,
          state: controlState.get(),
        })
      }
    }, 1000 / 90)
  })

  return _ipcCallbacks
}

export function stop() {
  _ipcCallbacks?.dispose()
  _ipcCallbacks = null
}

DmxConnection.maintain({
  update_ms: 1000,
  onUpdate: (dmxStatus) => {
    if (_ipcCallbacks !== null)
      _ipcCallbacks.publishers.dmx_connection_update(dmxStatus)
  },
  getChannels: () => _realtimeState.dmxOut,
  getConnectable: () => {
    return controlState.get()
      ? controlState.get().control.device.connectable.dmx
      : []
  },
})

MidiConnection.maintain({
  update_ms: 1000,
  onUpdate: (activeDevices) => {
    if (_ipcCallbacks !== null)
      _ipcCallbacks.publishers.midi_connection_update(activeDevices)
  },
  onMessage: (message) => {
    _midiThrottle.call(midiInputID(message), message)
  },
  getConnectable: () => {
    return controlState.get()
      ? controlState.get().control.device.connectable.midi
      : []
  },
})

function getNextRealtimeState(
  realtimeState: RealtimeState,
  nextTimeState: TimeState,
  ipcCallbacks: IPC_Callbacks,
  controlState: CleanReduxState
): RealtimeState {
  const scene =
    controlState.control.light.byId[controlState.control.light.active]
  const dmx = controlState.dmx
  const allParamKeys = getAllParamKeys(dmx)

  handleAutoScene(
    realtimeState,
    nextTimeState,
    controlState,
    (newLightScene) => {
      ipcCallbacks.publishers.dispatch(
        setActiveScene({
          sceneType: 'light',
          val: newLightScene,
        })
      )
    },
    (newVisualScene) => {
      ipcCallbacks.publishers.dispatch(
        setActiveScene({
          sceneType: 'visual',
          val: newVisualScene,
        })
      )
    }
  )

  const fixtures = flatten_fixtures(dmx.universe, dmx.fixtureTypesByID)

  const splitStates: SplitState[] = scene.splitScenes.map(
    (splitScene, splitIndex) => {
      const splitOutputParams = getOutputParams(
        nextTimeState.beats,
        scene,
        splitIndex,
        allParamKeys
      )
      let splitSceneFixtures = getFixturesInGroups(fixtures, splitScene.groups)
      let splitSceneFixturesWithinEpicness = splitSceneFixtures.filter(
        (fixture) => fixture.intensity <= (splitOutputParams.intensity ?? 1)
      )

      let newRandomizerState = resizeRandomizer(
        realtimeState.splitStates[splitIndex]?.randomizer ??
          initRandomizerState(),
        splitSceneFixturesWithinEpicness.length
      )

      newRandomizerState = updateIndexes(
        realtimeState.time.beats,
        newRandomizerState,
        nextTimeState,
        indexArray(splitSceneFixturesWithinEpicness.length),
        splitScene.randomizer
      )

      return {
        outputParams: splitOutputParams,
        randomizer: newRandomizerState,
      }
    }
  )

  return {
    time: nextTimeState,
    dmxOut: calculateDmx(controlState, splitStates, nextTimeState),
    splitStates,
  }
}

new WledManager(
  () => controlState.get(),
  () => _realtimeState
)
