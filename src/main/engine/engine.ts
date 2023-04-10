import { WebContents, ipcMain } from 'electron'
import * as DmxConnection from 'features/dmx/engine/dmxConnection'
import * as MidiConnection from 'features/midi/engine/midiConnection'

import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState, SplitState } from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../features/bpm/shared/TimeState'
import { getNewRandomizerState } from '../../features/bpm/shared/randomizer'
import { createModulationTransformer } from '../../features/modulation/engine'
import { onMidiMessageInput } from 'features/midi/engine/handleMidi'
import { VisualizerContainer } from '../../features/visualizer/engine/createVisualizerWindow'
import { calculateDmxOut, getChannels } from 'features/dmx/engine/dmxEngine'
import { handleAutoScene } from '../../features/scenes/engine/autoScene'
import { setActiveScene } from '../../renderer/redux/controlSlice'
import {
  flatten_fixtures,
  getFixturesInGroups,
} from '../../features/dmx/shared/dmxUtil'
import WledManager from '../../features/led/engine/wled_manager'

import { createApi, IPC_Callbacks } from './api'
import { createOutputParams } from 'features/params/engine'
import { getAllParamKeys } from 'features/params/shared/params'
import { FlattenedFixture } from 'features/dmx/shared/dmxFixtures'
import { Modulator } from 'features/modulation/shared/modulation'
import { SplitScene_t } from 'features/scenes/shared/Scenes'
import { createRealtimeManager } from 'features/bpm/engine'
import { createDisposer } from 'features/shared/engine'
import { AppConfig } from 'app.config'

// TODO: this should live in control state feature
const createControlStateManager = () => {
  let resolveFirstState: () => void
  const firstControlState = new Promise<void>((resolve) => {
    resolveFirstState = resolve
  })

  let cancelled = false

  const controlStateRef = {
    current: null as CleanReduxState | null,
  }

  return {
    set(state: CleanReduxState) {
      if (!controlStateRef.current) resolveFirstState()
      controlStateRef.current = state
    },
    stateRef: controlStateRef,

    dispose() {
      cancelled = true
    },

    waitForFirstControlState: (cb: () => void | Promise<void>) => {
      return firstControlState.then(async () => {
        if (!cancelled) await cb()
      })
    },
  }
}

const disposer = createDisposer()

export async function start(
  renderer: WebContents,
  visualizerContainer: VisualizerContainer
) {
  const realtimeManager = createRealtimeManager({
    next(previousStates, newStates) {
      const nextRealtimeState = getNextRealtimeState(
        {
          controlState: controlStateManager.stateRef.current!,
          realtimeState: previousStates.realtime,
          timeState: newStates.time,
        },
        api
      )
      return nextRealtimeState
    },
    onUpdate(newStates) {
      api.publishers.new_time_state(newStates.realtime)
      api.publishers.new_visualizer_state({
        rt: newStates.realtime,
        state: controlStateManager.stateRef.current!,
      })
    },
  })

  const controlStateManager = disposer.push(createControlStateManager())

  const api = disposer.push(
    createApi({
      ipcMain,
      realtimeManager,
      new_control_state: (newState) => {
        controlStateManager.set(newState)
      },
      renderer,
      visualizerContainer,
    })
  )

  await controlStateManager.waitForFirstControlState(() => {
    // We're currently calculating the realtimeState 90x per second.
    // The renderer should have a new realtime state on each animation frame (assuming a refresh rate of 60 hz)
    disposer.push(realtimeManager.start())

    disposer.push(
      DmxConnection.maintain({
        update_ms: AppConfig.dmx.updateIntervalMS,
        onUpdate: (dmxStatus) => {
          api.publishers.dmx_connection_update(dmxStatus)
        },
        getChannels: () => realtimeManager.realtimeStateRef.current.dmxOut,
        getConnectable: () => {
          return controlStateManager.stateRef.current!.control.device
            .connectable.dmx
        },
      })
    )

    disposer.push(
      MidiConnection.maintain({
        throttledWaitMS: AppConfig.midi.throttledWaitMS,
        update_ms: AppConfig.midi.updateIntervalMS,
        onUpdate: (activeDevices) => {
          api.publishers.midi_connection_update(activeDevices)
        },
        onMessage: (message) => {
          onMidiMessageInput(
            message,
            {
              state: controlStateManager.stateRef.current!,
              realtime: realtimeManager.realtimeStateRef.current,
            },
            realtimeManager.bpmController.nodeLink,
            api.publishers.dispatch,
            realtimeManager.bpmController.tapTempo
          )
        },
        getConnectable: () => {
          return controlStateManager.stateRef.current!.control.device
            .connectable.midi
        },
      })
    )

    disposer.push(
      new WledManager(
        () => controlStateManager.stateRef.current,
        () => realtimeManager.realtimeStateRef.current
      )
    )
  })

  return api
}

export function stop() {
  disposer.dispose()
}

const createTrackOutputs = (
  states: {
    realtimeState: RealtimeState
    timeState: TimeState
  },
  {
    allParamKeys,
    fixtures,
    modulators,
  }: {
    fixtures: FlattenedFixture[]
    allParamKeys: string[]
    modulators: Modulator[]
  }
) => {
  const { realtimeState, timeState } = states
  return (sceneTrack: SplitScene_t, trackIndex: number): SplitState => {
    const previousRandomizer = realtimeState.splitStates[trackIndex]?.randomizer
    const modulations = createModulationTransformer({
      beats: timeState.beats,
      modulators,
      trackIndex,
    })
    const outputParams = createOutputParams(
      { allParamKeys, baseParams: sceneTrack.baseParams },
      (options) => modulations.apply(options)
    )

    const splitSceneFixtures = getFixturesInGroups(fixtures, sceneTrack.groups)

    const splitSceneFixturesWithinEpicness = splitSceneFixtures.filter(
      (fixture) => fixture.intensity <= (outputParams.intensity ?? 1)
    )

    const newRandomizerState = getNewRandomizerState({
      previousRandomizerState: previousRandomizer,
      beatsLast: realtimeState.time.beats,
      options: sceneTrack.randomizer,
      size: splitSceneFixturesWithinEpicness.length,
      timeState,
    })

    return {
      outputParams,
      randomizer: newRandomizerState,
    }
  }
}

function getNextRealtimeState(
  states: {
    realtimeState: RealtimeState
    timeState: TimeState
    controlState: CleanReduxState
  },
  api: IPC_Callbacks
): RealtimeState {
  const scene =
    states.controlState.control.light.byId[
      states.controlState.control.light.active
    ]
  const dmx = states.controlState.dmx
  const allParamKeys = getAllParamKeys(dmx)

  handleAutoScene({
    states,
    onNew: {
      lightScene: (lightScene) =>
        api.publishers.dispatch(
          setActiveScene({
            sceneType: 'light',
            val: lightScene,
          })
        ),
      visualScene: (visualScene) =>
        api.publishers.dispatch(
          setActiveScene({
            sceneType: 'visual',
            val: visualScene,
          })
        ),
    },
  })

  const fixtures = flatten_fixtures(dmx.universe, dmx.fixtureTypesByID)

  // create scene tracks outputs
  const trackOutputs: SplitState[] = scene.splitScenes.map(
    createTrackOutputs(states, {
      allParamKeys,
      fixtures,
      modulators: scene.modulators,
    })
  )

  const outChannelConfig = getChannels({ state: states.controlState })

  if (states.timeState.isPlaying) {
    // send data to output devices
    calculateDmxOut(
      { splitStates: trackOutputs, state: states.controlState },
      outChannelConfig
    )
  }

  return {
    time: states.timeState,
    dmxOut: outChannelConfig.channels,
    splitStates: trackOutputs,
  }
}
