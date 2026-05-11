import { WebContents } from 'electron'
import { ConnectionManager } from './connections/ConnectionManager'
import * as MidiConnection from './midiConnection'
import NodeLink from 'node-link'
import { ipcSetup, IPC_Callbacks } from './ipcHandler'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  RealtimeState,
  initRealtimeState,
  SplitState,
} from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../shared/TimeState'
import {
  initRandomizerState,
  resizeRandomizer,
  updateIndexes,
} from '../../shared/randomizer'
import { getOutputParams } from '../../shared/modulation'
import { handleMessage } from './handleMidi'
import { VisualizerContainer } from './createVisualizerWindow'
import { calculateDmx } from './dmxEngine'
import { handleAutoScene } from '../../shared/autoScene'
import {
  setActiveScene,
  setAudioBeatTapHint,
} from '../../renderer/redux/controlSlice'
import { normalizeAudioInputSettings } from '../../shared/audioEngine'
import TapTempoEngine from './TapTempoEngine'
import { flatten_fixtures, getFixturesInGroups } from '../../shared/dmxUtil'
import { ThrottleMap } from './midiConnection'
import { MidiMessage, midiInputID } from '../../shared/midi'
import { getAllParamKeys } from '../../renderer/redux/dmxSlice'
import { indexArray } from '../../shared/util'
import WledManager from './wled/wled_manager'
import type { Page } from '../../shared/pages'
import type { OpenPageWindowOptions } from '../../shared/screenDisplays'
import VisualizerStreamOutputManager from './VisualizerStreamOutputManager'
import VisualizerInputRelayManager from './VisualizerInputRelayManager'
import ProjectMBridgeManager from './ProjectMBridgeManager'
import AtmosphericsOutputManager from './AtmosphericsOutputManager'
import {
  AudioEngineMetrics,
  initAudioEngineMetrics,
  normalizeAudioEngineMetrics,
} from '../../shared/audioEngine'
import {
  initVisualizerStreamingSettings,
  VisualizerNdiRuntimeDetection,
  VisualizerStreamConfig,
  VisualizerStreamingSettings,
  VisualizerStreamState,
  VisStreamHealth,
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from 'shared/visualizerStreaming'
import {
  detectNdiRuntimePaths,
  getNdiRuntimeDownloadUrl,
  ndiFfmpegList,
  visStreamHealth,
} from './visualizerStreamingRuntime'
import { detectProjectMRuntime, listProjectMPresets } from './projectmRuntime'
import { installProjectMBinaries } from './projectmInstaller'
import {
  patchVisualizerStreamingSettings,
  readVisualizerStreamingSettings,
  writeVisualizerStreamingSettings,
} from './visualizerStreamingSettingsStorage'
import { reportDiagnostic } from '../diagnostics'
import {
  telemetryCounter,
  telemetryDuration,
  telemetryEvent,
  telemetryGauge,
  telemetryHealth,
} from '../telemetry'

let _nodeLink = new NodeLink()
_nodeLink.setIsPlaying(true)
_nodeLink.enableStartStopSync(true)
_nodeLink.enable(true)
let _ipcCallbacks: IPC_Callbacks | null = null
let _controlState: CleanReduxState | null = null
let _realtimeState: RealtimeState = initRealtimeState()
let _lastFrameTime = 0
const _tapTempoEngine = new TapTempoEngine()

function shouldApplyTapTempoToNodeLink(control: CleanReduxState | null) {
  if (control === null) {
    return true
  }
  if (control.control.device.connectionSettings.midiClockBpmEnabled === true) {
    return false
  }
  const audio = normalizeAudioInputSettings(
    control.control.device.connectionSettings.audioInput
  )
  if (audio.enabled === true && audio.useBeatClock === true) {
    return false
  }
  return true
}

function shouldEmitAudioBeatTapHint(control: CleanReduxState | null) {
  if (control === null) {
    return false
  }
  return (
    normalizeAudioInputSettings(
      control.control.device.connectionSettings.audioInput
    ).enabled === true
  )
}

function _tapTempo() {
  _tapTempoEngine.tap(
    (newBpm) => {
      if (shouldApplyTapTempoToNodeLink(_controlState)) {
        _nodeLink.setTempo(newBpm)
      }
    },
    (newPhase, { force }) => {
      const info = _nodeLink.getSessionInfoCurrent()
      const newBeat = info.beats - info.phase + newPhase
      if (force) {
        _nodeLink.forceBeat(newBeat)
      } else {
        _nodeLink.requestBeat(newBeat)
      }
    },
    (bpm, atMs) => {
      if (!shouldEmitAudioBeatTapHint(_controlState) || _ipcCallbacks === null) {
        return
      }
      const rounded = Math.round(bpm)
      if (rounded < 45 || rounded > 220) {
        return
      }
      _ipcCallbacks.send_dispatch(setAudioBeatTapHint({ bpm: rounded, atMs }))
    }
  )
}
let _connectionManager = new ConnectionManager({
  controlState: () => _controlState,
  realtimeState: () => _realtimeState,
})
let _visualizerStreamOutputManager = new VisualizerStreamOutputManager()
let _visualizerInputRelayManager = new VisualizerInputRelayManager()
let _projectMBridgeManager = new ProjectMBridgeManager()
let _atmosphericsOutputManager = new AtmosphericsOutputManager()
let _visualizerStreamingSettings: VisualizerStreamingSettings | null = null
let _latestAudioMetrics: AudioEngineMetrics = initAudioEngineMetrics()
const NODELINK_STALL_DETECT_MS = 250
const NODELINK_DELTA_EPSILON = 1e-6
let _nodeLinkLastSessionBeats: number | null = null
let _nodeLinkLastSessionPhase: number | null = null
let _nodeLinkStallAccumulatedMs = 0
let _nodeLinkFallbackClockActive = false
let _nodeLinkFallbackBeats = 0
let _moverDebugLastSampleAtMs = 0
let _moverDebugLastBeat: number | null = null
let _moverDebugLastSignature: string | null = null
let _moverDebugLastWarnAtMs = 0
const AUDIO_BEAT_CLOCK_MAX_STALE_MS = 1600
const AUDIO_BEAT_CLOCK_TEMPO_EPSILON = 0.05
const AUDIO_BEAT_CLOCK_SMOOTH_ALPHA_SLOW = 0.055
const AUDIO_BEAT_CLOCK_SMOOTH_ALPHA_FAST = 0.2
const AUDIO_BEAT_CLOCK_PHASE_DEADBAND_BEATS = 0.04
const AUDIO_BEAT_CLOCK_NUDGE_GAIN = 0.45
const AUDIO_BEAT_CLOCK_NUDGE_DECAY_SEC = 0.55
const AUDIO_BEAT_CLOCK_MAX_NUDGE_BPM = 8
let _audioBeatClockSmoothedBpm: number | null = null
let _audioBeatClockNudgeBpm = 0
let _audioBeatClockLastUpdateMs = 0

const MIDI_CLOCK_PPQ = 24
const MIDI_CLOCK_MAX_TICK_SAMPLES = 192
const MIDI_CLOCK_STALE_MS = 450
const MIDI_CLOCK_MIN_TICK_MS = 0.07
const MIDI_CLOCK_MAX_TICK_MS = 22
let _midiClockTickWallMs: number[] = []
let _midiClockSmoothedBpm: number | null = null
let _midiClockLastTickWallMs = 0

function handleMidiSystemRealtime(status: number) {
  const wallMs = Date.now()
  if (status === 0xfa || status === 0xfc) {
    _midiClockTickWallMs.length = 0
    if (status === 0xfc) {
      _midiClockSmoothedBpm = null
    }
    return
  }
  if (status !== 0xf8) {
    return
  }

  _midiClockLastTickWallMs = wallMs
  _midiClockTickWallMs.push(wallMs)
  while (_midiClockTickWallMs.length > MIDI_CLOCK_MAX_TICK_SAMPLES) {
    _midiClockTickWallMs.shift()
  }
  if (_midiClockTickWallMs.length < MIDI_CLOCK_PPQ + 6) {
    return
  }

  const intervals: number[] = []
  const start = Math.max(1, _midiClockTickWallMs.length - 72)
  for (let i = start; i < _midiClockTickWallMs.length; i++) {
    const dt = _midiClockTickWallMs[i]! - _midiClockTickWallMs[i - 1]!
    if (Number.isFinite(dt) && dt > MIDI_CLOCK_MIN_TICK_MS && dt < MIDI_CLOCK_MAX_TICK_MS) {
      intervals.push(dt)
    }
  }
  if (intervals.length < MIDI_CLOCK_PPQ) {
    return
  }

  const slice = intervals.slice(-48)
  slice.sort((a, b) => a - b)
  const med = slice[Math.floor(slice.length / 2)]!
  if (!Number.isFinite(med) || med <= 0) {
    return
  }

  const instantBpm = 60000 / (med * MIDI_CLOCK_PPQ)
  if (!Number.isFinite(instantBpm) || instantBpm < 45 || instantBpm > 220) {
    return
  }

  if (_midiClockSmoothedBpm === null || !Number.isFinite(_midiClockSmoothedBpm)) {
    _midiClockSmoothedBpm = instantBpm
  } else {
    const delta = Math.abs(instantBpm - _midiClockSmoothedBpm)
    const alpha = delta > 5 ? 0.42 : delta > 1.8 ? 0.22 : 0.11
    _midiClockSmoothedBpm += (instantBpm - _midiClockSmoothedBpm) * alpha
  }
}

function getMidiClockDetectedBpm(controlState: CleanReduxState | null): number | null {
  if (controlState === null) {
    return null
  }
  if (controlState.control.device.connectionSettings.midiClockBpmEnabled !== true) {
    return null
  }
  const ageMs = Date.now() - _midiClockLastTickWallMs
  if (!Number.isFinite(ageMs) || ageMs > MIDI_CLOCK_STALE_MS) {
    return null
  }
  if (
    _midiClockSmoothedBpm === null ||
    !Number.isFinite(_midiClockSmoothedBpm) ||
    _midiClockSmoothedBpm < 45 ||
    _midiClockSmoothedBpm > 220
  ) {
    return null
  }
  return _midiClockSmoothedBpm
}
let _lastRealtimeLoopWarnAtMs = 0
let _lastDmxCalcWarnAtMs = 0

const _midiThrottle = new ThrottleMap((message: MidiMessage) => {
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
}, 1000 / 60)

export function getIpcCallbacks() {
  return _ipcCallbacks
}

export function getControlStateSnapshot(): CleanReduxState | null {
  return _controlState
}

export function start(
  renderer: WebContents,
  visualizerContainer: VisualizerContainer,
  openPageWindow: (page: Page, options?: OpenPageWindowOptions) => void,
  requestAppQuit: () => void,
  reconcileVideoEnabled?: () => void
) {
  telemetryCounter('engine', 'start')
  telemetryHealth('engine', 'ok', 'Engine start requested')
  _visualizerStreamingSettings = getVisualizerStreamingSettings()

  _ipcCallbacks = ipcSetup({
    renderers: new Set([renderer]),
    visualizerContainer: visualizerContainer,
    on_reconcile_video_enabled: reconcileVideoEnabled,
    on_new_control_state: (newState) => {
      _controlState = newState
      telemetryCounter('engine', 'control_state_updates')
      telemetryGauge(
        'engine',
        'active_light_splits',
        newState.control.light.byId[newState.control.light.active]?.splitScenes
          ?.length ?? 0
      )
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
      openPageWindow('Video')
    },
    on_request_app_quit: () => {
      requestAppQuit()
    },
    on_open_page_window: (page, options) => {
      openPageWindow(page, options)
    },
    on_audio_engine_metrics: (metrics: AudioEngineMetrics) => {
      _latestAudioMetrics = normalizeAudioEngineMetrics(metrics)
      telemetryGauge(
        'audio',
        'input_level',
        Number(_latestAudioMetrics.inputLevel ?? 0)
      )
      telemetryGauge(
        'audio',
        'energy_level',
        Number(_latestAudioMetrics.energyLevel ?? 0)
      )
      telemetryGauge(
        'audio',
        'beat_pulse',
        Number(_latestAudioMetrics.beatPulse ?? 0)
      )
      telemetryGauge(
        'audio',
        'detected_bpm',
        Number(_latestAudioMetrics.detectedBpm ?? 0),
        'bpm'
      )
      if (_latestAudioMetrics.beatDetected === true) {
        telemetryCounter('audio', 'beat_detected')
      }
    },
    on_visualizer_stream_start: (
      config: VisualizerStreamConfig
    ): VisualizerStreamState => {
      const mergedConfig = withStreamingDefaults(config)
      return _visualizerStreamOutputManager.start(
        mergedConfig,
        visualizerContainer.visualizer
      )
    },
    on_visualizer_stream_stop: (): VisualizerStreamState => {
      return _visualizerStreamOutputManager.stop()
    },
    on_visualizer_stream_get_state: (): VisualizerStreamState => {
      return _visualizerStreamOutputManager.getState()
    },
    on_visualizer_stream_health: (
      config: VisualizerStreamConfig
    ): VisStreamHealth => {
      const mergedConfig = withStreamingDefaults(config)
      const settings = getVisualizerStreamingSettings()
      return visStreamHealth(
        mergedConfig.ffmpegPath,
        mergedConfig.ndiMuxer,
        mergedConfig.ndiRuntimePath,
        settings.defaultFfmpegPath
      )
    },
    on_visualizer_stream_relay_start: async (
      req: VisualizerRelayRequest
    ): Promise<VisualizerRelayStartResult> => {
      return await _visualizerInputRelayManager.start(
        withRelayDefaults(req)
      )
    },
    on_visualizer_stream_relay_stop: (relayId: string) => {
      _visualizerInputRelayManager.stop(relayId)
    },
    on_visualizer_stream_settings_get: (): VisualizerStreamingSettings => {
      return getVisualizerStreamingSettings()
    },
    on_visualizer_stream_settings_set: (
      patch: Partial<VisualizerStreamingSettings>
    ): VisualizerStreamingSettings => {
      _visualizerStreamingSettings = patchVisualizerStreamingSettings(patch)
      return _visualizerStreamingSettings
    },
    on_visualizer_stream_detect_ndi_runtime:
      (): VisualizerNdiRuntimeDetection => {
        const settings = getVisualizerStreamingSettings()
        const foundPaths = detectNdiRuntimePaths(settings.ndiRuntimePath)
        const bestPath =
          settings.ndiRuntimePath.trim().length > 0 &&
          foundPaths.includes(settings.ndiRuntimePath.trim())
            ? settings.ndiRuntimePath.trim()
            : foundPaths[0] ?? null

        if (settings.ndiRuntimePath.trim().length === 0 && bestPath !== null) {
          _visualizerStreamingSettings = writeVisualizerStreamingSettings({
            ...settings,
            ndiRuntimePath: bestPath,
          })
        }

        return {
          bestPath,
          foundPaths,
          downloadUrl: getNdiRuntimeDownloadUrl(),
        }
      },
    on_visualizer_stream_ndi_list_sources: async () => {
      const settings = getVisualizerStreamingSettings()
      return await ndiFfmpegList(
        settings.defaultFfmpegPath,
        settings.ndiRuntimePath,
        settings.defaultFfmpegPath
      )
    },
    on_detect_projectm_runtime: () => detectProjectMRuntime(),
    on_projectm_list_presets: () => listProjectMPresets(),
    on_projectm_list_presets_in_directory: (directory: string) =>
      listProjectMPresets(directory),
    on_projectm_bridge_status: () => _projectMBridgeManager.getStatus(),
    on_projectm_install_binaries: async () => {
      _projectMBridgeManager.shutdownAll()
      const result = await installProjectMBinaries()
      _projectMBridgeManager.reload()
      return result
    },
    on_projectm_bridge_init_session: (request) =>
      _projectMBridgeManager.initSession(request),
    on_projectm_bridge_push_audio: (chunk) =>
      _projectMBridgeManager.pushAudio(chunk),
    on_projectm_bridge_render: (request) =>
      _projectMBridgeManager.render(request),
    on_projectm_bridge_shutdown_session: (sessionId) =>
      _projectMBridgeManager.shutdownSession(sessionId),
  })

  // We're currently calculating the realtimeState 90x per second.
  // The renderer should have a new realtime state on each animation frame (assuming a refresh rate of 60 hz)
  setInterval(() => {
    const tickStartedAt = performance.now()
    try {
      const nextTimeState = getNextTimeState(_controlState)
      if (_ipcCallbacks !== null && _controlState !== null) {
        _realtimeState = getNextRealtimeState(
          _realtimeState,
          nextTimeState,
          _ipcCallbacks,
          _controlState
        )
        maybeReportMoverRuntimeStall(_controlState, _realtimeState)
        _ipcCallbacks.send_time_state(
          _realtimeState,
          _controlState.control.master
        )
        _ipcCallbacks.send_visualizer_state({
          rt: _realtimeState,
          state: _controlState,
        })
      }
      telemetryHealth('engine.realtime', 'ok')
    } catch (error) {
      const err = error as Error
      telemetryCounter('engine.realtime', 'errors')
      telemetryHealth(
        'engine.realtime',
        'error',
        err?.message ?? String(error)
      )
      reportDiagnostic({
        source: 'main',
        area: 'engine',
        event: 'realtime-loop-error',
        level: 'error',
        message: err?.message ?? String(error),
        data: {
          stack: err?.stack,
        },
      })
    } finally {
      const tickMs = performance.now() - tickStartedAt
      telemetryCounter('engine.realtime', 'ticks')
      telemetryDuration('engine.realtime', 'tick_ms', tickMs)
      telemetryGauge('engine.realtime', 'last_tick_ms', tickMs, 'ms')
      if (tickMs > 18 && Date.now() - _lastRealtimeLoopWarnAtMs > 2000) {
        _lastRealtimeLoopWarnAtMs = Date.now()
        telemetryEvent(
          'engine.realtime',
          'tick-overrun',
          'warn',
          'Realtime loop tick exceeded budget',
          { tickMs }
        )
      }
    }
  }, 1000 / 90)
  return _ipcCallbacks
}

export function stop() {
  telemetryCounter('engine', 'stop')
  telemetryHealth('engine', 'warn', 'Engine stopped')
  _visualizerStreamOutputManager.stop()
  _visualizerInputRelayManager.stopAll()
  _projectMBridgeManager.shutdownAll()
  _ipcCallbacks = null
}

setInterval(async () => {
  if (_controlState) {
    const connectionStatus = await _connectionManager.updateConnections(
      _controlState.control.device.connectable.dmx
    )
    _ipcCallbacks?.send_dmx_connection_update(connectionStatus)
  }
}, 1000)

MidiConnection.maintain({
  update_ms: 1000,
  onUpdate: (activeDevices) => {
    if (_ipcCallbacks !== null)
      _ipcCallbacks.send_midi_connection_update(activeDevices)
  },
  onMessage: (message) => {
    _midiThrottle.call(midiInputID(message), message)
  },
  onMidiSystemRealtime: (status) => {
    handleMidiSystemRealtime(status)
  },
  getConnectable: () => {
    return _controlState ? _controlState.control.device.connectable.midi : []
  },
})

function getBeatFollowDetectedBpm(controlState: CleanReduxState | null): number | null {
  const midiBpm = getMidiClockDetectedBpm(controlState)
  if (midiBpm !== null) {
    return midiBpm
  }
  return getAudioBeatClockDetectedBpm(controlState)
}

function applyAudioBeatClock(controlState: CleanReduxState | null) {
  const detectedBpm = getBeatFollowDetectedBpm(controlState)
  if (detectedBpm === null) {
    _audioBeatClockSmoothedBpm = null
    _audioBeatClockNudgeBpm = 0
    _audioBeatClockLastUpdateMs = 0
    return
  }

  const nowMs = Date.now()
  const dtSec =
    _audioBeatClockLastUpdateMs > 0
      ? Math.max(1 / 240, (nowMs - _audioBeatClockLastUpdateMs) / 1000)
      : 1 / 90
  _audioBeatClockLastUpdateMs = nowMs

  if (
    _audioBeatClockSmoothedBpm === null ||
    !Number.isFinite(_audioBeatClockSmoothedBpm)
  ) {
    _audioBeatClockSmoothedBpm = detectedBpm
  } else {
    const delta = Math.abs(detectedBpm - _audioBeatClockSmoothedBpm)
    const alphaBase =
      delta > 2.5
        ? AUDIO_BEAT_CLOCK_SMOOTH_ALPHA_FAST
        : AUDIO_BEAT_CLOCK_SMOOTH_ALPHA_SLOW
    const changeNorm = clampNumber((delta - 1.25) / 16, 0, 1)
    const alpha = alphaBase + (0.52 - alphaBase) * changeNorm
    _audioBeatClockSmoothedBpm += (detectedBpm - _audioBeatClockSmoothedBpm) * alpha
  }

  if (
    _latestAudioMetrics.beatDetected &&
    getAudioBeatClockDetectedBpm(controlState) !== null
  ) {
    const session = _nodeLink.getSessionInfoCurrent()
    const phase = Number(session.phase)
    if (Number.isFinite(phase)) {
      // Signed phase error in beats, wrapped around beat boundary.
      // +0.1 => clock is ~0.1 beat ahead; -0.1 => clock is ~0.1 beat behind.
      const signedErrorBeats = phase <= 0.5 ? phase : phase - 1
      if (Math.abs(signedErrorBeats) > AUDIO_BEAT_CLOCK_PHASE_DEADBAND_BEATS) {
        const requestedNudge = clampNumber(
          -signedErrorBeats *
            Math.max(1, _audioBeatClockSmoothedBpm ?? detectedBpm) *
            AUDIO_BEAT_CLOCK_NUDGE_GAIN,
          -AUDIO_BEAT_CLOCK_MAX_NUDGE_BPM,
          AUDIO_BEAT_CLOCK_MAX_NUDGE_BPM
        )
        _audioBeatClockNudgeBpm = clampNumber(
          _audioBeatClockNudgeBpm * 0.35 + requestedNudge * 0.65,
          -AUDIO_BEAT_CLOCK_MAX_NUDGE_BPM,
          AUDIO_BEAT_CLOCK_MAX_NUDGE_BPM
        )
      }
    }
  }

  const nudgeDecay = Math.exp(-dtSec / AUDIO_BEAT_CLOCK_NUDGE_DECAY_SEC)
  _audioBeatClockNudgeBpm *= nudgeDecay
  if (Math.abs(_audioBeatClockNudgeBpm) < 0.005) {
    _audioBeatClockNudgeBpm = 0
  }

  const targetTempo = Math.max(
    45,
    Math.min(
      220,
      (_audioBeatClockSmoothedBpm ?? detectedBpm) + _audioBeatClockNudgeBpm
    )
  )
  const currentTempo = _nodeLink.getSessionInfoCurrent().bpm
  telemetryGauge('audio.beat_clock', 'target_tempo_bpm', targetTempo, 'bpm')
  telemetryGauge('audio.beat_clock', 'nudge_bpm', _audioBeatClockNudgeBpm, 'bpm')
  if (Math.abs(currentTempo - targetTempo) >= AUDIO_BEAT_CLOCK_TEMPO_EPSILON) {
    _nodeLink.setTempo(targetTempo)
    telemetryCounter('audio.beat_clock', 'tempo_adjustments')
  }
}

function getAudioBeatClockDetectedBpm(
  controlState: CleanReduxState | null
): number | null {
  if (controlState === null) {
    return null
  }

  const audioSettings = controlState.control.device.connectionSettings.audioInput
  if (
    audioSettings === undefined ||
    audioSettings.enabled !== true ||
    audioSettings.useBeatClock !== true ||
    _latestAudioMetrics.enabled !== true
  ) {
    return null
  }

  const detectedBpm = _latestAudioMetrics.detectedBpm
  if (detectedBpm === null || Number.isFinite(detectedBpm) !== true) {
    return null
  }

  const ageMs = Date.now() - _latestAudioMetrics.updatedAtMs
  if (Number.isFinite(ageMs) !== true || ageMs > AUDIO_BEAT_CLOCK_MAX_STALE_MS) {
    return null
  }

  return detectedBpm
}

// Todo: Desimate dt in this context
function getNextTimeState(controlState: CleanReduxState | null): TimeState {
  const startedAt = performance.now()
  applyAudioBeatClock(controlState)

  let currentTime = Date.now()
  let dt = currentTime - _lastFrameTime
  if (!Number.isFinite(dt) || dt <= 0 || _lastFrameTime === 0) {
    dt = 1000 / 90
  }

  _lastFrameTime = currentTime
  const sessionInfo = _nodeLink.getSessionInfoCurrent()
  const sessionBpm = Number(sessionInfo.bpm)
  const sessionBeats = Number(sessionInfo.beats)
  const sessionPhase = Number(sessionInfo.phase)
  const tempoCandidate = Number.isFinite(sessionBpm)
    ? sessionBpm
    : _realtimeState.time.bpm
  const safeBpm = sessionInfo.isPlaying
    ? clampNumber(tempoCandidate, 45, 220)
    : tempoCandidate
  let safeBeats = Number.isFinite(sessionBeats)
    ? sessionBeats
    : _realtimeState.time.beats
  let safePhase = Number.isFinite(sessionPhase)
    ? sessionPhase
    : _realtimeState.time.phase
  const expectedBeatAdvance = sessionInfo.isPlaying
    ? (safeBpm * dt) / 60000
    : 0

  if (sessionInfo.isPlaying) {
    if (_nodeLinkLastSessionBeats !== null) {
      const beatDelta = Math.abs(sessionBeats - _nodeLinkLastSessionBeats)
      const phaseDelta = Math.abs(
        sessionPhase - (_nodeLinkLastSessionPhase ?? sessionPhase)
      )
      const isStalled =
        (!Number.isFinite(sessionBeats) || beatDelta <= NODELINK_DELTA_EPSILON) &&
        (!Number.isFinite(sessionPhase) || phaseDelta <= NODELINK_DELTA_EPSILON)

      if (isStalled) {
        _nodeLinkStallAccumulatedMs += dt
      } else {
        _nodeLinkStallAccumulatedMs = 0
        _nodeLinkFallbackBeats = safeBeats
        if (_nodeLinkFallbackClockActive) {
          _nodeLinkFallbackClockActive = false
          telemetryCounter('engine.nodelink', 'fallback_recovered')
          telemetryHealth('engine.nodelink', 'ok', 'NodeLink clock recovered')
          reportDiagnostic({
            source: 'main',
            area: 'engine',
            event: 'nodelink-clock-recovered',
            level: 'info',
            data: {
              bpm: safeBpm,
              beats: safeBeats,
            },
          })
        }
      }
    } else {
      _nodeLinkFallbackBeats = safeBeats
      _nodeLinkStallAccumulatedMs = 0
    }

    if (_nodeLinkStallAccumulatedMs >= NODELINK_STALL_DETECT_MS) {
      if (!_nodeLinkFallbackClockActive) {
        _nodeLinkFallbackClockActive = true
        _nodeLinkFallbackBeats = safeBeats
        telemetryCounter('engine.nodelink', 'fallback_activated')
        telemetryHealth('engine.nodelink', 'warn', 'NodeLink clock stalled')
        reportDiagnostic({
          source: 'main',
          area: 'engine',
          event: 'nodelink-clock-stalled',
          level: 'warn',
          message: 'NodeLink beat clock stalled; switching to local fallback clock',
          data: {
            bpm: safeBpm,
            stallMs: Math.round(_nodeLinkStallAccumulatedMs),
          },
        })
      }
      _nodeLinkFallbackBeats += (safeBpm * dt) / 60000
      safeBeats = _nodeLinkFallbackBeats
      safePhase = ((safeBeats % 4) + 4) % 4
    }

    const observedAdvance = safeBeats - _realtimeState.time.beats
    if (
      Number.isFinite(observedAdvance) &&
      expectedBeatAdvance > 0.00001 &&
      observedAdvance < expectedBeatAdvance * 0.2
    ) {
      if (!_nodeLinkFallbackClockActive) {
        _nodeLinkFallbackClockActive = true
        _nodeLinkFallbackBeats = _realtimeState.time.beats
        telemetryCounter('engine.nodelink', 'underflow_fallback_activated')
        telemetryHealth(
          'engine.nodelink',
          'warn',
          'NodeLink beat advancement underflow'
        )
        reportDiagnostic({
          source: 'main',
          area: 'engine',
          event: 'nodelink-beat-underflow',
          level: 'warn',
          message: 'NodeLink beat advancement too small; forcing local beat progression',
          data: {
            bpm: safeBpm,
            observedAdvance,
            expectedAdvance: expectedBeatAdvance,
          },
        })
      }
      _nodeLinkFallbackBeats += expectedBeatAdvance
      safeBeats = _nodeLinkFallbackBeats
      safePhase = ((safeBeats % 4) + 4) % 4
    }
  } else {
    if (_nodeLinkFallbackClockActive) {
      telemetryCounter('engine.nodelink', 'fallback_disabled')
      telemetryHealth('engine.nodelink', 'ok', 'NodeLink fallback disabled')
      reportDiagnostic({
        source: 'main',
        area: 'engine',
        event: 'nodelink-clock-fallback-disabled',
        level: 'info',
      })
    }
    _nodeLinkFallbackClockActive = false
    _nodeLinkStallAccumulatedMs = 0
    _nodeLinkFallbackBeats = safeBeats
    safePhase = ((safeBeats % 4) + 4) % 4
  }

  _nodeLinkLastSessionBeats = Number.isFinite(sessionBeats)
    ? sessionBeats
    : safeBeats
  _nodeLinkLastSessionPhase = Number.isFinite(sessionPhase)
    ? sessionPhase
    : safePhase

  telemetryDuration('engine', 'get_next_time_state_ms', performance.now() - startedAt)
  telemetryGauge('engine', 'time_dt_ms', dt, 'ms')
  telemetryGauge('engine', 'time_bpm', safeBpm, 'bpm')
  telemetryGauge('engine', 'time_phase', safePhase)

  return {
    ...sessionInfo,
    bpm: safeBpm,
    beats: safeBeats,
    phase: safePhase,
    dt: dt,
    quantum: 4.0,
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function getFirstMoverAxisProbe(
  controlState: CleanReduxState,
  rt: RealtimeState
): {
  fixtureId: string
  universe: number
  panDmx: number
  tiltDmx: number
} | null {
  for (const fixture of controlState.dmx.universe) {
    const fixtureType = controlState.dmx.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) {
      continue
    }

    let panChannel: number | undefined
    let tiltChannel: number | undefined
    fixtureType.channels.forEach((channel, index) => {
      if (channel.type !== 'axis' || channel.isFine) return
      if (channel.dir === 'x' && panChannel === undefined) {
        panChannel = fixture.ch + index - 1
      } else if (channel.dir === 'y' && tiltChannel === undefined) {
        tiltChannel = fixture.ch + index - 1
      }
    })

    if (panChannel === undefined || tiltChannel === undefined) {
      continue
    }

    const universeIndex = Math.max(1, Math.round(fixture.universe || 1)) - 1
    const universeData = rt.dmxOutByUniverse[universeIndex]
    if (universeData === undefined) {
      continue
    }

    const panDmx = Number(universeData[panChannel] ?? 0)
    const tiltDmx = Number(universeData[tiltChannel] ?? 0)
    const fixtureId =
      typeof fixture.id === 'string' && fixture.id.trim().length > 0
        ? fixture.id
        : `${fixture.type}:${fixture.universe}:${fixture.ch}`
    return {
      fixtureId,
      universe: universeIndex + 1,
      panDmx,
      tiltDmx,
    }
  }

  return null
}

function maybeReportMoverRuntimeStall(
  controlState: CleanReduxState,
  rt: RealtimeState
) {
  const now = Date.now()
  if (now - _moverDebugLastSampleAtMs < 750) {
    return
  }
  _moverDebugLastSampleAtMs = now

  const activeScene = controlState.control.light.byId[controlState.control.light.active]
  const moverSplitIndex = activeScene.splitScenes.findIndex(
    (split) => split.groups?.Movers === true
  )
  const moverSplitParams =
    moverSplitIndex >= 0 ? rt.splitStates[moverSplitIndex]?.outputParams : undefined
  const xAxis = Number(moverSplitParams?.xAxis ?? Number.NaN)
  const yAxis = Number(moverSplitParams?.yAxis ?? Number.NaN)
  const probe = getFirstMoverAxisProbe(controlState, rt)
  const beatNow = Number(rt.time.beats)
  const beatDelta =
    _moverDebugLastBeat === null || !Number.isFinite(beatNow)
      ? 0
      : beatNow - _moverDebugLastBeat
  _moverDebugLastBeat = Number.isFinite(beatNow) ? beatNow : _moverDebugLastBeat

  const signature = probe
    ? `${probe.panDmx.toFixed(4)}:${probe.tiltDmx.toFixed(4)}:${xAxis.toFixed(4)}:${yAxis.toFixed(4)}`
    : `none:${xAxis.toFixed(4)}:${yAxis.toFixed(4)}`

  const sameAsLast =
    _moverDebugLastSignature !== null && signature === _moverDebugLastSignature
  _moverDebugLastSignature = signature

  if (
    probe !== null &&
    beatDelta > 0.2 &&
    sameAsLast &&
    now - _moverDebugLastWarnAtMs > 2500
  ) {
    _moverDebugLastWarnAtMs = now
    telemetryCounter('engine.movers', 'dmx_static_warnings')
    telemetryHealth(
      'engine.movers',
      'warn',
      'Mover DMX static while beat clock advances'
    )
    reportDiagnostic({
      source: 'main',
      area: 'engine',
      event: 'mover-dmx-static-with-moving-clock',
      level: 'warn',
      data: {
        beatDelta,
        isPlaying: rt.time.isPlaying,
        bpm: rt.time.bpm,
        moverSplitIndex,
        xAxis,
        yAxis,
        fixtureId: probe.fixtureId,
        universe: probe.universe,
        panDmx: probe.panDmx,
        tiltDmx: probe.tiltDmx,
      },
    })
  }
}

function getNextRealtimeState(
  realtimeState: RealtimeState,
  nextTimeState: TimeState,
  ipcCallbacks: IPC_Callbacks,
  controlState: CleanReduxState
): RealtimeState {
  const startedAt = performance.now()
  const scene =
    controlState.control.light.byId[controlState.control.light.active]
  const dmx = controlState.dmx
  const allParamKeys = getAllParamKeys(dmx)

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

  const fixtures = flatten_fixtures(dmx.universe, dmx.fixtureTypesByID)

  const splitStates: SplitState[] = scene.splitScenes.map(
    (splitScene, splitIndex) => {
      const splitOutputParams = getOutputParams(
        nextTimeState.beats,
        scene,
        splitIndex,
        allParamKeys,
        _latestAudioMetrics
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

  const dmxStartedAt = performance.now()
  const dmxOutByUniverse = calculateDmx(controlState, splitStates, nextTimeState)
  const atmos = _atmosphericsOutputManager.apply(
    controlState,
    splitStates,
    nextTimeState,
    _latestAudioMetrics,
    dmxOutByUniverse
  )
  const dmxMs = performance.now() - dmxStartedAt
  telemetryDuration('engine.dmx', 'calculate_ms', dmxMs)
  telemetryGauge('engine.dmx', 'calculate_last_ms', dmxMs, 'ms')
  telemetryGauge('engine.dmx', 'active_splits', splitStates.length)
  telemetryGauge('engine.dmx', 'fixture_count', fixtures.length)
  if (dmxMs > 14 && Date.now() - _lastDmxCalcWarnAtMs > 2000) {
    _lastDmxCalcWarnAtMs = Date.now()
    telemetryEvent(
      'engine.dmx',
      'calculate-overrun',
      'warn',
      'DMX calculation exceeded frame budget',
      {
        dmxMs,
        splitCount: splitStates.length,
        fixtureCount: fixtures.length,
      }
    )
  }

  telemetryDuration(
    'engine',
    'get_next_realtime_state_ms',
    performance.now() - startedAt
  )

  return {
    time: nextTimeState,
    dmxOutByUniverse,
    dmxOut: dmxOutByUniverse[0] ?? Array(512).fill(0),
    splitStates,
    audio: _latestAudioMetrics,
    atmos,
  }
}

new WledManager({
  controlState: () => _controlState,
  realtimeState: () => _realtimeState,
})

function getVisualizerStreamingSettings() {
  if (_visualizerStreamingSettings === null) {
    _visualizerStreamingSettings = readVisualizerStreamingSettings()
    const hasConfiguredRuntime =
      _visualizerStreamingSettings.ndiRuntimePath.trim().length > 0

    if (!hasConfiguredRuntime) {
      const detected = detectNdiRuntimePaths('')
      if (detected.length > 0) {
        _visualizerStreamingSettings = writeVisualizerStreamingSettings({
          ..._visualizerStreamingSettings,
          ndiRuntimePath: detected[0],
        })
      }
    }
  }

  return _visualizerStreamingSettings ?? initVisualizerStreamingSettings()
}

function withStreamingDefaults(config: VisualizerStreamConfig): VisualizerStreamConfig {
  const settings = getVisualizerStreamingSettings()
  return {
    ...config,
    ffmpegPath: choosePath(config.ffmpegPath, settings.defaultFfmpegPath, 'auto'),
    ndiRuntimePath: choosePath(config.ndiRuntimePath, settings.ndiRuntimePath, ''),
  }
}

function withRelayDefaults(req: VisualizerRelayRequest): VisualizerRelayRequest {
  const settings = getVisualizerStreamingSettings()
  return {
    ...req,
    ffmpegPath: choosePath(req.ffmpegPath, settings.defaultFfmpegPath, 'auto'),
  }
}

function choosePath(primary: string, fallback: string, defaultValue: string) {
  const primaryTrimmed =
    typeof primary === 'string' ? primary.trim() : ''
  if (primaryTrimmed.length > 0 && primaryTrimmed.toLowerCase() !== 'auto') {
    return primaryTrimmed
  }

  const fallbackTrimmed =
    typeof fallback === 'string' ? fallback.trim() : ''
  if (fallbackTrimmed.length > 0) {
    return fallbackTrimmed
  }

  return defaultValue
}
