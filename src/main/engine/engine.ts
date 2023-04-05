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

import { indexArray } from '../../features/utils/util'
import WledManager from '../../features/led/engine/wled_manager'
import {
  getNextTimeState,
  _nodeLink,
  _tapTempo,
} from 'features/bpm/engine/Link'
import { createApi, IPC_Callbacks } from './api'
import { getAllParamKeys } from 'features/params/redux'

let _realtimeState: RealtimeState = initRealtimeState()

// TODO: this should live in control state feature
const controlStateManager = () => {
  let resolveFirstState: () => void
  const firstControlState = new Promise<void>((resolve) => {
    resolveFirstState = resolve
  })

  let cancelled = false

  const manager = {
    set(state: CleanReduxState) {
      if (!manager.controlState) resolveFirstState()
      manager.controlState = state
    },
    controlState: null as CleanReduxState | null,

    dispose() {
      cancelled = true
    },

    waitForFirstControlState: (cb: () => void) => {
      firstControlState.then(() => {
        if (!cancelled) cb()
      })
    },
  }
  return manager
}

const disposer = {
  _disposeables: [] as { dispose(): void }[],
  push<T extends { dispose(): void }>(disposeable: T) {
    disposer._disposeables.push(disposeable)
    return disposeable
  },
  dispose() {
    disposer._disposeables.forEach((disposeable) => {
      disposeable.dispose()
    })
    disposer._disposeables = []
  },
}

export function start(
  renderer: WebContents,
  visualizerContainer: VisualizerContainer
) {
  const controlState = disposer.push(controlStateManager())
  const api = disposer.push(
    createApi({
      ipcMain,
      realtimeState: _realtimeState,
      new_control_state: (newState) => {
        controlState.set(newState)
      },
      renderer,
      visualizerContainer,
    })
  )

  // TODO: now we don't need null checks for control state
  controlState.waitForFirstControlState(() => {
    // We're currently calculating the realtimeState 90x per second.
    // The renderer should have a new realtime state on each animation frame (assuming a refresh rate of 60 hz)
    const realtimeStateInterval = setInterval(() => {
      const nextTimeState = getNextTimeState()

      _realtimeState = getNextRealtimeState(
        _realtimeState,
        nextTimeState,
        api,
        controlState.controlState!
      )
      api.publishers.new_time_state(_realtimeState)
      api.publishers.new_visualizer_state({
        rt: _realtimeState,
        state: controlState.controlState!,
      })
    }, 1000 / 90)

    disposer.push({
      dispose() {
        clearInterval(realtimeStateInterval)
      },
    })

    const _midiThrottle = disposer.push(
      new ThrottleMap((message: MidiMessage) => {
        // TODO: maybe we could cancel the throttle on close and initialize throttle after callbacks and control state are initialized
        // to avoid null checks

        handleMessage(
          message,
          controlState.controlState!,
          _realtimeState,
          _nodeLink,
          api.publishers.dispatch,
          _tapTempo
        )
      }, 1000 / 60)
    )

    disposer.push(
      DmxConnection.maintain({
        update_ms: 1000,
        onUpdate: (dmxStatus) => {
          api.publishers.dmx_connection_update(dmxStatus)
        },
        getChannels: () => _realtimeState.dmxOut,
        getConnectable: () => {
          return controlState.controlState!.control.device.connectable.dmx
        },
      })
    )

    disposer.push(
      MidiConnection.maintain({
        update_ms: 1000,
        onUpdate: (activeDevices) => {
          api.publishers.midi_connection_update(activeDevices)
        },
        onMessage: (message) => {
          _midiThrottle.call(midiInputID(message), message)
        },
        getConnectable: () => {
          return controlState.controlState!.control.device.connectable.midi
        },
      })
    )

    disposer.push(
      new WledManager(
        () => controlState.controlState,
        () => _realtimeState
      )
    )
  })

  return api
}

export function stop() {
  disposer.dispose()
}

function getNextRealtimeState(
  realtimeState: RealtimeState,
  nextTimeState: TimeState,
  api: IPC_Callbacks,
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
      api.publishers.dispatch(
        setActiveScene({
          sceneType: 'light',
          val: newLightScene,
        })
      )
    },
    (newVisualScene) => {
      api.publishers.dispatch(
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
