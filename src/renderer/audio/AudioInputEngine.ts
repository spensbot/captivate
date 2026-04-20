import { store } from '../redux/store'
import { realtimeStore } from '../redux/realtimeStore'
import {
  getDesktopAudioSourceId,
  send_audio_engine_metrics,
  sendDiagnosticsEvent,
  sendTelemetryMark,
} from '../ipcHandler'
import {
  AUDIO_INPUT_DEVICE_DESKTOP,
  AudioEngineMetrics,
  AudioInputSettings,
  getAudioBandLevel,
  initAudioBandConfig,
  initAudioEngineMetrics,
  normalizeAudioEngineMetrics,
  normalizeAudioInputSettings,
} from '../../shared/audioEngine'

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function lerp(min: number, max: number, t: number) {
  return min + (max - min) * clamp01(t)
}

function alphaFromTau(dtSec: number, tauSec: number) {
  if (!Number.isFinite(dtSec) || dtSec <= 0) return 0
  return 1 - Math.exp(-dtSec / Math.max(0.01, tauSec))
}

export default class AudioInputEngine {
  private unsubscribe: (() => void) | null = null
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private gain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private rafHandle: number | null = null
  private lastSettings: AudioInputSettings | null = null
  private lastAnalyzeAtMs = 0
  private lastSentAtMs = 0
  private prevSpectrum: Float32Array = new Float32Array(0)
  private beatEnergyEma = 0
  private beatOnsetEma = 0
  private beatOnsetDevEma = 0
  private lowBandEma = 0
  private midBandEma = 0
  private highBandEma = 0
  private broadBandEma = 0
  private fluxEma = 0
  private beatPulse = 0
  private lastBeatAtMs = 0
  private bpmEstimate: number | null = null
  private stabilizedBpmEstimate: number | null = null
  private stabilizedBpmLastAtMs = 0
  private energyShortEma = 0
  private energyLongEma = 0
  private energyTrendEma = 0
  private energyLevelEma = 0
  private energyFloorEma = 0
  private energyCeilingEma = 0
  /** Prior-frame composite (for detecting breakdown-style drops). */
  private lastCompositeEnergy = 0
  private recentBeatIntervalsMs: number[] = []
  private onsetHistory: number[] = []
  private analysisFpsEma = 60
  private autocorrTempoBpm: number | null = null
  private autocorrTempoConfidence = 0
  /** PLP-style predominant local period (harmonic-summed + lag-domain local max). */
  private plpTempoBpm: number | null = null
  private plpTempoConfidence = 0
  private bpmConfidenceEma = 0
  private lastTempoFromOnsetAtMs = 0
  private deviceListener: (() => void) | null = null
  private lastTelemetryAtMs = 0
  private analyzeMsAccum = 0
  private analyzeSampleCount = 0
  private analyzeMsMax = 0
  private analyzeOverrunCount = 0

  start() {
    if (this.unsubscribe !== null) {
      return
    }

    this.unsubscribe = store.subscribe(() => {
      this.applySettingsFromState()
    })
    this.applySettingsFromState()
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'engine_started',
      type: 'counter',
      by: 1,
    })
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'health',
      type: 'health',
      status: 'ok',
      message: 'Audio engine started',
    })

    const mediaDevices = navigator.mediaDevices
    if (mediaDevices && typeof mediaDevices.addEventListener === 'function') {
      const onDeviceChange = () => this.applySettingsFromState()
      mediaDevices.addEventListener('devicechange', onDeviceChange)
      this.deviceListener = () => {
        mediaDevices.removeEventListener('devicechange', onDeviceChange)
      }
    }
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.deviceListener) {
      this.deviceListener()
      this.deviceListener = null
    }
    this.stopAnalysisLoop()
    this.teardownAudioGraph()
    send_audio_engine_metrics(initAudioEngineMetrics())
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'engine_stopped',
      type: 'counter',
      by: 1,
    })
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'health',
      type: 'health',
      status: 'warn',
      message: 'Audio engine stopped',
    })
  }

  private applySettingsFromState() {
    const state = store.getState()
    const settings = normalizeAudioInputSettings(
      state.control.present.device.connectionSettings.audioInput
    )

    const previous = this.lastSettings
    this.lastSettings = settings

    if (settings.enabled !== true) {
      if (
        previous !== null &&
        previous.enabled !== true &&
        this.stream === null &&
        this.analyser === null
      ) {
        return
      }
      this.stopAnalysisLoop()
      this.teardownAudioGraph()
      this.sendMetrics(initAudioEngineMetrics(), true)
      return
    }

    if (
      previous === null ||
      previous.deviceId !== settings.deviceId ||
      this.stream === null
    ) {
      void this.startStream(settings)
      return
    }

    if (this.gain !== null) {
      this.gain.gain.value = settings.inputGain
    }
    this.startAnalysisLoop()
  }

  private async startStream(settings: AudioInputSettings) {
    this.stopAnalysisLoop()
    this.teardownAudioGraph()

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.sendMetrics(initAudioEngineMetrics(), true)
      return
    }

    const buildConstraints = (deviceId: string): MediaStreamConstraints => {
      const withDevice =
        deviceId.trim().length > 0
          ? { deviceId: { exact: deviceId } }
          : {}
      return {
        audio: {
          ...withDevice,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      }
    }

    let stream: MediaStream | null = null
    if (settings.deviceId === AUDIO_INPUT_DEVICE_DESKTOP) {
      stream = await this.getDesktopAudioStream()
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          buildConstraints(settings.deviceId)
        )
      } catch {
        if (settings.deviceId.trim().length > 0) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(buildConstraints(''))
          } catch {
            stream = null
          }
        }
      }
    }

    if (stream === null) {
      console.warn('AudioInputEngine: unable to start capture stream')
      sendDiagnosticsEvent({
        source: 'renderer-main',
        area: 'audio',
        event: 'capture-stream-start-failed',
        level: 'warn',
        message: 'Unable to start audio capture stream',
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'capture_start_failures',
        type: 'counter',
        by: 1,
      })
      this.sendMetrics(initAudioEngineMetrics(), true)
      return
    }

    const context = new AudioContext({ latencyHint: 'interactive' })
    if (context.state !== 'running') {
      try {
        await context.resume()
      } catch {}
    }
    const source = context.createMediaStreamSource(stream)
    const gain = context.createGain()
    gain.gain.value = settings.inputGain
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.2

    source.connect(gain)
    gain.connect(analyser)

    this.stream = stream
    this.context = context
    this.source = source
    this.gain = gain
    this.analyser = analyser
    this.prevSpectrum = new Float32Array(analyser.frequencyBinCount)
    this.beatEnergyEma = 0
    this.beatOnsetEma = 0
    this.beatOnsetDevEma = 0
    this.lowBandEma = 0
    this.midBandEma = 0
    this.highBandEma = 0
    this.broadBandEma = 0
    this.fluxEma = 0
    this.beatPulse = 0
    this.lastBeatAtMs = 0
    this.bpmEstimate = null
    this.stabilizedBpmEstimate = null
    this.stabilizedBpmLastAtMs = 0
    this.energyShortEma = 0
    this.energyLongEma = 0
    this.energyTrendEma = 0
    this.energyLevelEma = 0
    this.energyFloorEma = 0
    this.energyCeilingEma = 0
    this.lastCompositeEnergy = 0
    this.recentBeatIntervalsMs = []
    this.onsetHistory = []
    this.analysisFpsEma = 60
    this.autocorrTempoBpm = null
    this.autocorrTempoConfidence = 0
    this.plpTempoBpm = null
    this.plpTempoConfidence = 0
    this.bpmConfidenceEma = 0
    this.lastTempoFromOnsetAtMs = 0
    this.analyzeMsAccum = 0
    this.analyzeSampleCount = 0
    this.analyzeMsMax = 0
    this.analyzeOverrunCount = 0
    this.lastAnalyzeAtMs = performance.now()
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'capture_started',
      type: 'counter',
      by: 1,
    })
    sendTelemetryMark({
      source: 'renderer-main',
      subsystem: 'audio',
      metric: 'health',
      type: 'health',
      status: 'ok',
      message: 'Audio capture active',
    })
    this.startAnalysisLoop()
  }

  private async getDesktopAudioStream(): Promise<MediaStream | null> {
    const nativeDesktopStream = await this.getDesktopAudioStreamFromElectronSource()
    if (nativeDesktopStream !== null) {
      return nativeDesktopStream
    }

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function'
    ) {
      return null
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        // Keep the capture session alive; ending the video track can terminate loopback audio
        // on some platforms/driver stacks.
        for (const videoTrack of stream.getVideoTracks()) {
          videoTrack.enabled = false
        }
        return stream
      }

      for (const track of stream.getTracks()) {
        track.stop()
      }
      return await this.getLoopbackDeviceStream()
    } catch {
      return await this.getLoopbackDeviceStream()
    }
  }

  private async getDesktopAudioStreamFromElectronSource(): Promise<MediaStream | null> {
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      return null
    }

    let sourceId: string | null = null
    try {
      sourceId = await getDesktopAudioSourceId()
    } catch {
      sourceId = null
    }

    if (typeof sourceId !== 'string' || sourceId.trim().length <= 0) {
      return null
    }

    const desktopConstraints: MediaStreamConstraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
        },
      } as any,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: 2,
          maxHeight: 2,
          maxFrameRate: 1,
        },
      } as any,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(desktopConstraints)
      if (stream.getAudioTracks().length <= 0) {
        for (const track of stream.getTracks()) {
          track.stop()
        }
        return null
      }

      // Keep capture alive while minimizing video overhead.
      for (const videoTrack of stream.getVideoTracks()) {
        videoTrack.enabled = false
      }
      return stream
    } catch {
      return null
    }
  }

  private async getLoopbackDeviceStream(): Promise<MediaStream | null> {
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.enumerateDevices !== 'function' ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      return null
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const candidates = devices
        .filter((device) => device.kind === 'audioinput')
        .filter((device) =>
          /(stereo mix|loopback|what u hear|monitor of)/i.test(device.label)
        )

      for (const candidate of candidates) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: candidate.deviceId },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          })
          if (stream.getAudioTracks().length > 0) {
            return stream
          }
          for (const track of stream.getTracks()) {
            track.stop()
          }
        } catch {
          // Continue trying other loopback-like devices.
        }
      }
    } catch {
      return null
    }

    return null
  }

  private startAnalysisLoop() {
    if (this.rafHandle !== null) {
      return
    }

    const frame = () => {
      this.rafHandle = requestAnimationFrame(frame)
      this.analyze()
    }
    this.rafHandle = requestAnimationFrame(frame)
  }

  private stopAnalysisLoop() {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
  }

  private teardownAudioGraph() {
    if (this.source) {
      try {
        this.source.disconnect()
      } catch {}
    }
    if (this.gain) {
      try {
        this.gain.disconnect()
      } catch {}
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect()
      } catch {}
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
    }

    if (this.context) {
      void this.context.close()
    }

    this.stream = null
    this.context = null
    this.source = null
    this.gain = null
    this.analyser = null
  }

  private analyze() {
    const analyzeStartAt = performance.now()
    const analyser = this.analyser
    const context = this.context
    if (analyser === null || context === null) {
      return
    }

    const freq = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(freq)

    const waveform = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(waveform)

    const now = performance.now()
    const dtMs = Math.max(1, now - this.lastAnalyzeAtMs)
    const dtSec = dtMs / 1000
    this.lastAnalyzeAtMs = now
    const fps = 1 / Math.max(1e-3, dtSec)
    this.analysisFpsEma += (fps - this.analysisFpsEma) * 0.08
    this.beatPulse = Math.max(0, this.beatPulse - dtMs / 220)
    const settings = normalizeAudioInputSettings(this.lastSettings ?? undefined)

    let rms = 0
    for (let i = 0; i < waveform.length; i++) {
      const sample = waveform[i]
      rms += sample * sample
    }
    rms = Math.sqrt(rms / Math.max(1, waveform.length))
    const inputLevel = clamp01(rms * 2.2)

    const spectrum: number[] = Array.from(freq, (value) => value / 255)
    if (this.prevSpectrum.length !== spectrum.length) {
      this.prevSpectrum = new Float32Array(spectrum.length)
    }
    let flux = 0
    for (let i = 0; i < spectrum.length; i++) {
      const current = spectrum[i]
      const previous = this.prevSpectrum[i] ?? 0
      flux += Math.max(0, current - previous)
      this.prevSpectrum[i] = current
    }
    flux = flux / Math.max(1, spectrum.length)
    const fluxNormalized = clamp01(flux * 5.2)

    const nyquistHz = context.sampleRate / 2
    const metricsForBands = normalizeAudioEngineMetrics({
      enabled: true,
      spectrum,
      nyquistHz,
    })
    const lowEnergy = getAudioBandLevel(
      metricsForBands,
      {
        ...initAudioBandConfig(),
        lowHz: 35,
        highHz: 180,
        gain: 1.05,
      }
    )
    const midEnergy = getAudioBandLevel(
      metricsForBands,
      {
        ...initAudioBandConfig(),
        lowHz: 180,
        highHz: 2200,
        gain: 1,
      }
    )
    const broadEnergy = getAudioBandLevel(
      metricsForBands,
      {
        ...initAudioBandConfig(),
        lowHz: 35,
        highHz: 5500,
        gain: 1,
      }
    )
    const highEnergy = getAudioBandLevel(
      metricsForBands,
      {
        ...initAudioBandConfig(),
        lowHz: 2200,
        highHz: 9000,
        gain: 1,
      }
    )

    const sensitivity = clamp01(settings.beatSensitivity)
    const bandBaselineTauSec = lerp(0.62, 0.22, sensitivity)
    const bandBaselineAlpha = alphaFromTau(dtSec, bandBaselineTauSec)
    this.lowBandEma += (lowEnergy - this.lowBandEma) * bandBaselineAlpha
    this.midBandEma += (midEnergy - this.midBandEma) * bandBaselineAlpha
    this.highBandEma += (highEnergy - this.highBandEma) * bandBaselineAlpha
    this.broadBandEma += (broadEnergy - this.broadBandEma) * bandBaselineAlpha
    this.fluxEma += (fluxNormalized - this.fluxEma) * bandBaselineAlpha

    const lowOnset = Math.max(0, lowEnergy - this.lowBandEma)
    const midOnset = Math.max(0, midEnergy - this.midBandEma)
    const highOnset = Math.max(0, highEnergy - this.highBandEma)
    const broadOnset = Math.max(0, broadEnergy - this.broadBandEma)
    const fluxOnset = Math.max(0, fluxNormalized - this.fluxEma)
    const onsetTotal = Math.max(1e-5, lowOnset + midOnset + highOnset)
    const highRhythmShare = clamp01((midOnset + highOnset) / onsetTotal)

    const lowWeight = lerp(0.62, 0.34, highRhythmShare)
    const midWeight = lerp(0.22, 0.38, highRhythmShare)
    const highWeight = lerp(0.06, 0.18, highRhythmShare)
    const fluxWeight = lerp(0.14, 0.2, highRhythmShare)
    const broadWeight = 0.12
    const baseWeight = 0.08
    const beatFeature =
      lowOnset * lowWeight +
      midOnset * midWeight +
      highOnset * highWeight +
      fluxOnset * fluxWeight +
      broadOnset * broadWeight +
      broadEnergy * baseWeight

    const beatBaselineTauSec = lerp(1.9, 0.85, sensitivity)
    const beatBaselineAlpha = alphaFromTau(dtSec, beatBaselineTauSec)
    this.beatEnergyEma += (beatFeature - this.beatEnergyEma) * beatBaselineAlpha

    const beatOnset = Math.max(0, beatFeature - this.beatEnergyEma)
    const onsetTauSec = lerp(0.95, 0.34, sensitivity)
    const onsetAlpha = alphaFromTau(dtSec, onsetTauSec)
    this.beatOnsetEma += (beatOnset - this.beatOnsetEma) * onsetAlpha
    const onsetForTempo = Math.max(0, beatOnset - this.beatOnsetEma * 0.22)
    this.onsetHistory.push(onsetForTempo)
    const maxOnsetHistory = Math.max(256, Math.round(this.analysisFpsEma * 10))
    while (this.onsetHistory.length > maxOnsetHistory) {
      this.onsetHistory.shift()
    }

    const onsetDev = Math.abs(beatOnset - this.beatOnsetEma)
    const onsetDevTauSec = lerp(1.15, 0.46, sensitivity)
    const onsetDevAlpha = alphaFromTau(dtSec, onsetDevTauSec)
    this.beatOnsetDevEma += (onsetDev - this.beatOnsetDevEma) * onsetDevAlpha

    const periodicityConf = clamp01(
      this.autocorrTempoConfidence * 0.55 + this.plpTempoConfidence * 0.45
    )
    const periodicRefreshMs = Math.round(lerp(300, 165, periodicityConf))
    if (now - this.lastTempoFromOnsetAtMs > periodicRefreshMs) {
      this.lastTempoFromOnsetAtMs = now
      const tempoFromOnset = this.estimateTempoFromOnsetHistory(this.analysisFpsEma)
      const tempoFromPlp = this.estimatePlpFromOnsetHistory(this.analysisFpsEma)

      let mergedBpm: number | null = null
      let mergedConfidence = 0
      if (tempoFromOnset !== null && tempoFromPlp !== null) {
        const bpmDiff = Math.abs(tempoFromOnset.bpm - tempoFromPlp.bpm)
        const agree = bpmDiff < 6.2
        const nearAgree = !agree && bpmDiff < 9.5
        const wPlp = clamp01(
          0.26 +
            0.52 * tempoFromPlp.confidence +
            (agree ? 0.14 : nearAgree ? 0.04 : -0.1)
        )
        mergedBpm = tempoFromOnset.bpm * (1 - wPlp) + tempoFromPlp.bpm * wPlp
        mergedConfidence = clamp01(
          0.44 * tempoFromOnset.confidence +
            0.4 * tempoFromPlp.confidence +
            (agree ? 0.16 : nearAgree ? 0.07 : 0) -
            clamp01((bpmDiff - 5) / 28) * 0.24
        )
      } else if (tempoFromOnset !== null) {
        mergedBpm = tempoFromOnset.bpm
        mergedConfidence = tempoFromOnset.confidence
      } else if (tempoFromPlp !== null) {
        mergedBpm = tempoFromPlp.bpm
        mergedConfidence = tempoFromPlp.confidence * 0.9
      }

      const wallMs = Date.now()
      const tapStr = this.getBeatTapHintStrength(wallMs)
      const tapHintBpm = normalizeAudioInputSettings(
        this.lastSettings ?? undefined
      ).beatTapHintBpm
      if (
        tapStr > 0.04 &&
        tapHintBpm !== null &&
        mergedBpm !== null &&
        Number.isFinite(mergedBpm)
      ) {
        const k = tapStr * 0.38
        mergedBpm = mergedBpm * (1 - k) + tapHintBpm * k
        mergedConfidence = clamp01(mergedConfidence + tapStr * 0.12)
        if (Math.abs(mergedBpm - tapHintBpm) < 4.5) {
          mergedConfidence = clamp01(mergedConfidence + 0.09 * tapStr)
        }
      }

      if (mergedBpm !== null && Number.isFinite(mergedBpm)) {
        const autocorrBlend = this.autocorrTempoBpm === null ? 0.42 : 0.16
        this.autocorrTempoBpm =
          this.autocorrTempoBpm === null
            ? mergedBpm
            : this.autocorrTempoBpm * (1 - autocorrBlend) + mergedBpm * autocorrBlend
        const confidenceBlend = this.autocorrTempoConfidence <= 0 ? 0.36 : 0.2
        this.autocorrTempoConfidence =
          this.autocorrTempoConfidence <= 0
            ? mergedConfidence
            : this.autocorrTempoConfidence * (1 - confidenceBlend) +
              mergedConfidence * confidenceBlend
      } else {
        this.autocorrTempoConfidence *= 0.985
      }

      if (tempoFromPlp !== null) {
        const plpBlend = this.plpTempoBpm === null ? 0.48 : 0.2
        const plpConfBlend = this.plpTempoConfidence <= 0 ? 0.34 : 0.18
        this.plpTempoBpm =
          this.plpTempoBpm === null
            ? tempoFromPlp.bpm
            : this.plpTempoBpm * (1 - plpBlend) + tempoFromPlp.bpm * plpBlend
        this.plpTempoConfidence =
          this.plpTempoConfidence <= 0
            ? tempoFromPlp.confidence
            : this.plpTempoConfidence * (1 - plpConfBlend) +
              tempoFromPlp.confidence * plpConfBlend
      } else {
        this.plpTempoConfidence *= 0.97
      }
    }

    const dynamicNoiseFloor =
      this.broadBandEma * 0.45 + this.fluxEma * 0.35 + inputLevel * 0.2
    const thresholdMultiplier = lerp(1.7, 0.95, sensitivity)
    const thresholdDevMultiplier = lerp(2.45, 1.3, sensitivity)
    const thresholdFloor =
      lerp(0.018, 0.004, sensitivity) +
      dynamicNoiseFloor * lerp(0.16, 0.08, sensitivity)
    const minTriggerLevel = Math.max(
      0.002,
      lerp(0.018, 0.004, sensitivity) +
        dynamicNoiseFloor * lerp(0.11, 0.06, sensitivity)
    )
    const refBpmForInterval =
      this.bpmEstimate !== null && Number.isFinite(this.bpmEstimate)
        ? this.bpmEstimate
        : this.getBlendedPeriodicBpm()
    const estimatedBeatPeriodMs =
      refBpmForInterval !== null && Number.isFinite(refBpmForInterval)
        ? 60000 / Math.max(1, refBpmForInterval)
        : null
    const intervalFactor =
      lerp(0.72, 0.58, sensitivity) * lerp(1, 1.2, highRhythmShare)
    const minBeatIntervalMs = Math.max(
      120,
      settings.beatMinIntervalMs,
      estimatedBeatPeriodMs === null
        ? 0
        : estimatedBeatPeriodMs * intervalFactor
    )
    const bpmBlend = clamp01(settings.bpmSmoothing)
    const threshold =
      this.beatOnsetEma * thresholdMultiplier +
      this.beatOnsetDevEma * thresholdDevMultiplier +
      thresholdFloor
    const steerConf = clamp01(this.bpmConfidenceEma)
    const beatGateLoosen = lerp(1.06, 0.91, steerConf)
    const beatTriggerLoosen = lerp(1.05, 0.89, steerConf)
    const thresholdUse = threshold * beatGateLoosen
    const minTriggerUse = minTriggerLevel * beatTriggerLoosen
    const silenceGate =
      inputLevel > 0.006 ||
      broadEnergy > 0.008 ||
      fluxOnset > 0.008 ||
      (highRhythmShare > 0.42 && midEnergy > 0.004)
    const beatDetectedStrong =
      beatOnset > thresholdUse &&
      beatFeature > minTriggerUse &&
      silenceGate &&
      now - this.lastBeatAtMs > minBeatIntervalMs
    const weakFluxGate = steerConf > 0.36 ? 0.64 : 0.72
    const beatDetectedWeak =
      highRhythmShare > 0.38 &&
      silenceGate &&
      (steerConf > 0.2 || highRhythmShare > 0.52) &&
      fluxOnset > thresholdUse * weakFluxGate &&
      midOnset > minTriggerUse * 0.48 &&
      beatOnset > thresholdUse * 0.8 &&
      beatFeature > minTriggerUse * 0.72 &&
      now - this.lastBeatAtMs > minBeatIntervalMs * 1.06
    const beatDetected = beatDetectedStrong || beatDetectedWeak

    if (beatDetected) {
      if (this.lastBeatAtMs > 0) {
        const periodMs = now - this.lastBeatAtMs
        if (this.pushBeatIntervalMs(periodMs)) {
          const weightedPeriodMs = this.getWeightedBeatPeriodMs()
          const hasStableWindow =
            this.bpmEstimate !== null || this.recentBeatIntervalsMs.length >= 3
          if (weightedPeriodMs !== null && hasStableWindow) {
            const rawBpm = 60000 / Math.max(1, weightedPeriodMs)
            const instantBpm = this.normalizeTempoBpm(rawBpm, this.getPreferredTempoReference())
            if (
              instantBpm !== null &&
              Number.isFinite(instantBpm) &&
              instantBpm >= 45 &&
              instantBpm <= 220
            ) {
              this.bpmEstimate =
                this.bpmEstimate === null
                  ? instantBpm
                  : this.bpmEstimate * (1 - bpmBlend) + instantBpm * bpmBlend
              const periodicRef = this.getBlendedPeriodicBpm()
              if (periodicRef !== null && Number.isFinite(periodicRef)) {
                const alignBlend = lerp(0.11, 0.34, steerConf) + this.plpTempoConfidence * 0.07
                this.bpmEstimate =
                  this.bpmEstimate * (1 - alignBlend) + periodicRef * alignBlend
              }
            }
          }
        }
      }
      this.lastBeatAtMs = now
      this.beatPulse = 1
    } else if (
      this.bpmEstimate === null &&
      this.autocorrTempoBpm !== null &&
      Number.isFinite(this.autocorrTempoBpm)
    ) {
      this.bpmEstimate = this.autocorrTempoBpm
    }

    const sessionBpm = Number(realtimeStore.getState().time.bpm)
    const bpmForEnergy = Number.isFinite(sessionBpm)
      ? Math.max(60, Math.min(190, sessionBpm))
      : this.bpmEstimate !== null && Number.isFinite(this.bpmEstimate)
      ? Math.max(60, Math.min(190, this.bpmEstimate))
      : 120
    const beatSec = 60 / bpmForEnergy
    const barSec = beatSec * 4
    const twoBarsSec = barSec * 2
    const fourBarsSec = barSec * 4
    const eightBarsSec = barSec * 8
    const sixteenBarsSec = barSec * 16

    // Musical multi-bar trend, but include RMS + highs so compressed EDM/house does not
    // read falsely low; transients + flux help breakdowns and drops.
    const transient = clamp01(beatOnset * 1.9 + fluxNormalized * 0.24)
    const dancePresence = clamp01(
      0.55 * highEnergy + 0.45 * Math.max(midEnergy, highEnergy * 0.92)
    )
    const instantEnergy = clamp01(
      lowEnergy * 0.36 +
        midEnergy * 0.19 +
        broadEnergy * 0.19 +
        dancePresence * 0.14 +
        transient * 0.1 +
        inputLevel * 0.12
    )

    const shortAlpha = alphaFromTau(dtSec, Math.max(0.12, barSec * 0.42))
    const longAlpha = alphaFromTau(dtSec, Math.max(0.55, fourBarsSec * 0.88))
    const trendAlpha = alphaFromTau(dtSec, Math.max(0.9, eightBarsSec * 0.92))
    if (
      this.energyShortEma <= 0 &&
      this.energyLongEma <= 0 &&
      this.energyTrendEma <= 0
    ) {
      this.energyShortEma = instantEnergy
      this.energyLongEma = instantEnergy
      this.energyTrendEma = instantEnergy
    } else {
      this.energyShortEma += (instantEnergy - this.energyShortEma) * shortAlpha
      this.energyLongEma += (instantEnergy - this.energyLongEma) * longAlpha
      this.energyTrendEma += (instantEnergy - this.energyTrendEma) * trendAlpha
    }

    const compositeEnergy = clamp01(
      this.energyTrendEma * 0.46 +
        this.energyLongEma * 0.32 +
        this.energyShortEma * 0.22
    )

    const compositeDropPerSec =
      this.lastCompositeEnergy > 1e-6
        ? (this.lastCompositeEnergy - compositeEnergy) / Math.max(1e-3, dtSec)
        : 0
    this.lastCompositeEnergy = compositeEnergy
    const fastBreakdown = compositeDropPerSec > 0.32

    const floorAlpha = alphaFromTau(dtSec, Math.max(0.58, sixteenBarsSec * 0.78))
    const ceilingRiseAlpha = alphaFromTau(dtSec, Math.max(0.28, twoBarsSec * 0.82))
    let ceilingFallAlpha = alphaFromTau(
      dtSec,
      Math.max(0.62, sixteenBarsSec * 1.02)
    )
    if (fastBreakdown) {
      ceilingFallAlpha = Math.min(1, ceilingFallAlpha * 2.6)
    }
    if (this.energyFloorEma <= 0 && this.energyCeilingEma <= 0) {
      this.energyFloorEma = compositeEnergy
      this.energyCeilingEma = compositeEnergy
    } else {
      this.energyFloorEma += (compositeEnergy - this.energyFloorEma) * floorAlpha
      if (compositeEnergy >= this.energyCeilingEma) {
        this.energyCeilingEma +=
          (compositeEnergy - this.energyCeilingEma) * ceilingRiseAlpha
      } else {
        this.energyCeilingEma +=
          (compositeEnergy - this.energyCeilingEma) * ceilingFallAlpha
      }
    }

    const autoFloor = Math.max(0, this.energyFloorEma - 0.02)
    const autoCeiling = Math.min(
      1,
      Math.max(this.energyCeilingEma + 0.01, autoFloor + 0.24)
    )
    const normSpan = Math.max(fastBreakdown ? 0.14 : 0.19, autoCeiling - autoFloor)
    const normalizedEnergy = clamp01((compositeEnergy - autoFloor) / normSpan)

    const deltaEnergy = normalizedEnergy - this.energyLevelEma
    const jitterDeadband = 0.002
    const changeMagnitude = Math.abs(this.energyShortEma - this.energyTrendEma)
    const changeBoost = clamp01((changeMagnitude - 0.012) / 0.16)
    const edgeBoost = clamp01((Math.abs(deltaEnergy) - 0.042) / 0.24)
    const beatBoost = beatDetected ? 0.07 : 0
    const baseAlpha = alphaFromTau(dtSec, Math.max(0.38, barSec * 3.2))
    const dropFollow =
      normalizedEnergy < this.energyLevelEma
        ? 1 + changeBoost * 0.28 + edgeBoost * 0.32 + (fastBreakdown ? 0.45 : 0)
        : 1
    const alpha = Math.min(
      1,
      (baseAlpha +
        (1 - baseAlpha) * (changeBoost * 0.48 + edgeBoost * 0.52 + beatBoost)) *
        dropFollow
    )

    if (Math.abs(deltaEnergy) > jitterDeadband) {
      this.energyLevelEma += (normalizedEnergy - this.energyLevelEma) * alpha
    }
    const energyLevel = clamp01(this.energyLevelEma)

    const stabilizedBpm = this.updateStabilizedBpmEstimate(
      this.bpmEstimate,
      beatDetected,
      dtSec,
      now
    )
    const bpmConfidence = this.computeBpmConfidence(
      stabilizedBpm,
      now,
      beatDetected,
      inputLevel,
      broadEnergy,
      dtSec
    )

    const metrics: AudioEngineMetrics = {
      enabled: true,
      inputLevel,
      energyLevel,
      beatPulse: this.beatPulse,
      beatDetected,
      detectedBpm: stabilizedBpm,
      detectedBpmConfidence: bpmConfidence,
      spectrum,
      nyquistHz,
      updatedAtMs: Date.now(),
    }

    this.sendMetrics(metrics, beatDetected)
    const analyzeMs = performance.now() - analyzeStartAt
    this.analyzeMsAccum += analyzeMs
    this.analyzeSampleCount += 1
    this.analyzeMsMax = Math.max(this.analyzeMsMax, analyzeMs)
    if (analyzeMs > 10) {
      this.analyzeOverrunCount += 1
    }
  }

  private sendMetrics(metrics: AudioEngineMetrics, force: boolean) {
    const now = performance.now()
    if (!force && now - this.lastSentAtMs < 33) {
      return
    }
    this.lastSentAtMs = now
    send_audio_engine_metrics(metrics)
    if (force || now - this.lastTelemetryAtMs >= 1000) {
      this.lastTelemetryAtMs = now
      const analyzeAvgMs =
        this.analyzeSampleCount > 0
          ? this.analyzeMsAccum / this.analyzeSampleCount
          : 0
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'input_level',
        type: 'gauge',
        value: metrics.inputLevel,
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'energy_level',
        type: 'gauge',
        value: metrics.energyLevel,
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'detected_bpm',
        type: 'gauge',
        value: Number(metrics.detectedBpm ?? 0),
        unit: 'bpm',
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'detected_bpm_confidence',
        type: 'gauge',
        value: metrics.detectedBpmConfidence,
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'analysis_fps',
        type: 'gauge',
        value: this.analysisFpsEma,
        unit: 'fps',
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio.analysis',
        metric: 'analyze_ms_avg',
        type: 'gauge',
        value: analyzeAvgMs,
        unit: 'ms',
      })
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio.analysis',
        metric: 'analyze_ms_max',
        type: 'gauge',
        value: this.analyzeMsMax,
        unit: 'ms',
      })
      if (this.analyzeOverrunCount > 0) {
        sendTelemetryMark({
          source: 'renderer-main',
          subsystem: 'audio.analysis',
          metric: 'analyze_overruns',
          type: 'counter',
          by: this.analyzeOverrunCount,
        })
      }
      sendTelemetryMark({
        source: 'renderer-main',
        subsystem: 'audio',
        metric: 'health',
        type: 'health',
        status: metrics.enabled ? 'ok' : 'warn',
        message: metrics.enabled ? 'Audio metrics flowing' : 'Audio metrics idle',
      })
      this.analyzeMsAccum = 0
      this.analyzeSampleCount = 0
      this.analyzeMsMax = 0
      this.analyzeOverrunCount = 0
    }
  }

  private pushBeatIntervalMs(periodMs: number) {
    const clamped = Math.max(180, Math.min(1400, periodMs))
    const weighted = this.getWeightedBeatPeriodMs()
    const blendedPeriodic = this.getBlendedPeriodicBpm()
    const autocorrPeriodMs =
      blendedPeriodic !== null && Number.isFinite(blendedPeriodic)
        ? 60000 / Math.max(1, blendedPeriodic)
        : this.autocorrTempoBpm !== null && Number.isFinite(this.autocorrTempoBpm)
        ? 60000 / Math.max(1, this.autocorrTempoBpm)
        : null
    const plpPeriodMs =
      this.plpTempoBpm !== null &&
      Number.isFinite(this.plpTempoBpm) &&
      this.plpTempoConfidence >= 0.1
        ? 60000 / Math.max(1, this.plpTempoBpm)
        : null
    const normalized =
      weighted === null
        ? clamped
        : this.normalizeBeatIntervalMs(
            clamped,
            weighted,
            autocorrPeriodMs,
            plpPeriodMs
          )

    const harmonicRatio =
      weighted === null ? 1 : normalized / Math.max(1, weighted)
    const looksLikeHarmonicSwitch =
      weighted !== null &&
      ((harmonicRatio >= 0.45 && harmonicRatio <= 0.56) ||
        (harmonicRatio >= 1.78 && harmonicRatio <= 2.22))
    const alignsAutocorr =
      autocorrPeriodMs !== null &&
      Math.abs(normalized - autocorrPeriodMs) / Math.max(1, autocorrPeriodMs) <=
        0.2
    const allowHarmonicSwitch =
      looksLikeHarmonicSwitch &&
      alignsAutocorr &&
      this.autocorrTempoConfidence >= 0.16

    if (weighted !== null) {
      const deviation = Math.abs(normalized - weighted) / Math.max(1, weighted)
      // Ignore obviously off-grid transient spikes while still allowing tempo changes.
      const autocorrLoosen =
        this.autocorrTempoConfidence >= 0.22 ? 0.07 : 0
      const tapStrIv = this.getBeatTapHintStrength(Date.now())
      const tapLoosenIv = tapStrIv > 0.11 ? tapStrIv * 0.055 : 0
      const allowedDeviation =
        (this.recentBeatIntervalsMs.length >= 8 ? 0.22 : 0.3) +
        (allowHarmonicSwitch ? 0.35 : 0) +
        autocorrLoosen +
        tapLoosenIv
      if (deviation > allowedDeviation && !alignsAutocorr) {
        return false
      }
      if (allowHarmonicSwitch) {
        // Reset lock window so half/double-time corrections happen quickly.
        this.recentBeatIntervalsMs = []
      }
    }

    this.recentBeatIntervalsMs.push(normalized)
    while (this.recentBeatIntervalsMs.length > 20) {
      this.recentBeatIntervalsMs.shift()
    }
    return true
  }

  private getWeightedBeatPeriodMs() {
    const values = this.recentBeatIntervalsMs
    if (values.length <= 0) {
      return null
    }

    const median = this.getMedian(values)
    if (median === null) {
      return null
    }

    // Reject outliers around the central pulse period so half/double artifacts
    // do not hijack the estimate.
    const stability = this.getBeatIntervalStabilityConfidence()
    const tolerance = this.bpmEstimate === null ? 0.42 : lerp(0.32, 0.21, stability)
    let weightedSum = 0
    let weightTotal = 0
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      const deviation = Math.abs(value - median) / Math.max(1, median)
      if (deviation > tolerance) {
        continue
      }
      const weight = i + 1
      weightedSum += value * weight
      weightTotal += weight
    }
    if (weightTotal <= 0) {
      return median
    }
    return weightedSum / weightTotal
  }

  private getMedian(values: number[]) {
    if (values.length <= 0) {
      return null
    }

    const sorted = [...values].sort((left, right) => left - right)
    const middle = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 1) {
      return sorted[middle]
    }
    return (sorted[middle - 1] + sorted[middle]) * 0.5
  }

  private normalizeBeatIntervalMs(
    intervalMs: number,
    referenceMs: number,
    autocorrPeriodMs: number | null = null,
    plpPeriodMs: number | null = null
  ) {
    const raw = Math.max(180, Math.min(1400, intervalMs))
    const candidates = [
      { value: raw, factor: 1 },
      { value: raw * 0.5, factor: 0.5 },
      { value: raw * 0.75, factor: 0.75 },
      { value: raw * 2, factor: 2 },
      { value: raw * 1.5, factor: 1.5 },
      { value: raw * 0.25, factor: 0.25 },
      { value: raw * 4, factor: 4 },
    ]
      .map((entry) => ({
        ...entry,
        value: Math.max(180, Math.min(1400, entry.value)),
      }))
      .filter((entry) => Number.isFinite(entry.value))

    const safeReference = Math.max(1, referenceMs)
    const hasAutocorr = autocorrPeriodMs !== null && Number.isFinite(autocorrPeriodMs)
    const safeAutocorr = hasAutocorr ? Math.max(1, autocorrPeriodMs as number) : 0
    const autocorrWeight = hasAutocorr
      ? lerp(0.45, 1.25, this.autocorrTempoConfidence)
      : 0
    const hasPlp = plpPeriodMs !== null && Number.isFinite(plpPeriodMs)
    const safePlp = hasPlp ? Math.max(1, plpPeriodMs as number) : 0
    const plpWeight = hasPlp
      ? lerp(0.32, 1.05, this.plpTempoConfidence) * (hasAutocorr ? 0.78 : 1)
      : 0

    let best = candidates[0]?.value ?? raw
    let bestScore = Number.POSITIVE_INFINITY
    for (const candidate of candidates) {
      const refDelta = Math.abs(candidate.value - safeReference) / safeReference
      const autocorrDelta =
        hasAutocorr && safeAutocorr > 0
          ? Math.abs(candidate.value - safeAutocorr) / safeAutocorr
          : 0
      const plpDelta =
        hasPlp && safePlp > 0 ? Math.abs(candidate.value - safePlp) / safePlp : 0
      const harmonicPenalty =
        candidate.factor === 1
          ? 0
          : candidate.factor === 0.25 || candidate.factor === 4
            ? 0.09
            : 0.045
      const score =
        refDelta +
        autocorrDelta * autocorrWeight +
        plpDelta * plpWeight +
        harmonicPenalty
      if (score < bestScore) {
        best = candidate.value
        bestScore = score
      }
    }
    return best
  }

  private estimateTempoFromOnsetHistory(
    fps: number
  ): { bpm: number; confidence: number } | null {
    if (!Number.isFinite(fps) || fps <= 1) {
      return null
    }
    const history = this.onsetHistory
    if (history.length < Math.max(96, Math.round(fps * 3.5))) {
      return null
    }

    const minBpm = 55
    const maxBpm = 210
    const minLag = Math.max(1, Math.round((fps * 60) / maxBpm))
    const maxLag = Math.max(minLag + 1, Math.round((fps * 60) / minBpm))
    if (maxLag >= history.length - 2) {
      return null
    }

    const lagCount = maxLag - minLag + 1
    const baseScores = new Array<number>(lagCount).fill(-Infinity)
    const current = this.bpmEstimate ?? this.autocorrTempoBpm

    for (let lag = minLag; lag <= maxLag; lag++) {
      let score = 0
      let normLeft = 0
      let normRight = 0
      for (let i = lag; i < history.length; i++) {
        const left = history[i]
        const right = history[i - lag]
        score += left * right
        normLeft += left * left
        normRight += right * right
      }
      if (normLeft <= 1e-6 || normRight <= 1e-6) {
        continue
      }
      score /= Math.sqrt(normLeft * normRight)
      const bpm = (60 * fps) / lag
      if (current !== null && Number.isFinite(current)) {
        const deltaNorm = Math.abs(bpm - current) / Math.max(1, current)
        score *= 1 - Math.min(0.34, deltaNorm * 0.5)
      } else {
        // Initial lock gently favors the dance-music center without excluding slower tracks.
        score *= 1 - Math.min(0.28, Math.abs(bpm - 120) / 180)
      }
      baseScores[lag - minLag] = score
    }

    let bestLag = -1
    let bestBoosted = -Infinity
    let bestRawAtBestLag = -Infinity

    for (let lag = minLag; lag <= maxLag; lag++) {
      const idx = lag - minLag
      const raw = baseScores[idx]
      if (!Number.isFinite(raw) || raw <= -1e6) {
        continue
      }
      let boosted = raw
      const idxDouble = 2 * lag - minLag
      if (idxDouble >= 0 && idxDouble < lagCount) {
        const s2 = baseScores[idxDouble]
        if (Number.isFinite(s2)) {
          boosted += 0.22 * Math.max(0, s2)
        }
      }
      const lagHalf = Math.floor(lag / 2)
      if (lagHalf >= minLag) {
        const idxHalf = lagHalf - minLag
        if (idxHalf >= 0 && idxHalf < lagCount) {
          const sh = baseScores[idxHalf]
          if (Number.isFinite(sh)) {
            boosted += 0.11 * Math.max(0, sh)
          }
        }
      }
      if (boosted > bestBoosted) {
        bestBoosted = boosted
        bestLag = lag
        bestRawAtBestLag = raw
      }
    }

    const scoreFloor = history.length >= Math.round(fps * 6.5) ? 0.056 : 0.066
    if (
      bestLag <= 0 ||
      !Number.isFinite(bestBoosted) ||
      !Number.isFinite(bestRawAtBestLag) ||
      bestRawAtBestLag < scoreFloor
    ) {
      return null
    }

    const bpm = (60 * fps) / bestLag
    const normalized = this.normalizeTempoBpm(bpm, this.getPreferredTempoReference())
    if (normalized === null) {
      return null
    }

    let secondBestRaw = -Infinity
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (lag === bestLag) {
        continue
      }
      const r = baseScores[lag - minLag]
      if (Number.isFinite(r) && r > secondBestRaw) {
        secondBestRaw = r
      }
    }
    const prominence =
      secondBestRaw > -Infinity ? bestRawAtBestLag - secondBestRaw : bestRawAtBestLag
    const confidence = clamp01(
      clamp01((bestRawAtBestLag - 0.055) / 0.19) * 0.74 +
        clamp01(prominence / 0.1) * 0.26
    )
    return {
      bpm: normalized,
      confidence,
    }
  }

  /**
   * PLP-inspired predominant period: unbiased lag correlation, harmonic summation
   * across period (2×, 3×, ½), then a small local-max filter in lag to pick a single peak.
   */
  private estimatePlpFromOnsetHistory(
    fps: number
  ): { bpm: number; confidence: number } | null {
    if (!Number.isFinite(fps) || fps <= 1) {
      return null
    }
    const history = this.onsetHistory
    if (history.length < Math.max(96, Math.round(fps * 3.5))) {
      return null
    }

    const minBpm = 55
    const maxBpm = 210
    const minLag = Math.max(1, Math.round((fps * 60) / maxBpm))
    const maxLag = Math.max(minLag + 1, Math.round((fps * 60) / minBpm))
    if (maxLag >= history.length - 2) {
      return null
    }

    const lagCount = maxLag - minLag + 1
    const raw = new Array<number>(lagCount).fill(0)

    for (let lag = minLag; lag <= maxLag; lag++) {
      let score = 0
      let normLeft = 0
      let normRight = 0
      for (let i = lag; i < history.length; i++) {
        const left = history[i]
        const right = history[i - lag]
        score += left * right
        normLeft += left * left
        normRight += right * right
      }
      if (normLeft <= 1e-6 || normRight <= 1e-6) {
        continue
      }
      raw[lag - minLag] = score / Math.sqrt(normLeft * normRight)
    }

    const harmonic = new Array<number>(lagCount).fill(0)
    for (let i = 0; i < lagCount; i++) {
      const lag = minLag + i
      let v = raw[i]
      const idx2 = 2 * lag - minLag
      if (idx2 >= 0 && idx2 < lagCount) {
        v += 0.5 * Math.max(0, raw[idx2])
      }
      const idx3 = 3 * lag - minLag
      if (idx3 >= 0 && idx3 < lagCount) {
        v += 0.26 * Math.max(0, raw[idx3])
      }
      const lagHalf = Math.floor(lag / 2)
      if (lagHalf >= minLag) {
        const idxH = lagHalf - minLag
        if (idxH >= 0 && idxH < lagCount) {
          v += 0.24 * Math.max(0, raw[idxH])
        }
      }
      harmonic[i] = v
    }

    const local = new Array<number>(lagCount).fill(0)
    for (let i = 0; i < lagCount; i++) {
      const a = i > 0 ? harmonic[i - 1]! : harmonic[i]!
      const b = harmonic[i]!
      const c = i < lagCount - 1 ? harmonic[i + 1]! : harmonic[i]!
      local[i] = Math.max(a, b, c)
    }

    let bestI = -1
    let bestVal = -Infinity
    let secondVal = -Infinity
    for (let i = 0; i < lagCount; i++) {
      const v = local[i]!
      if (v > bestVal) {
        secondVal = bestVal
        bestVal = v
        bestI = i
      } else if (v > secondVal) {
        secondVal = v
      }
    }

    const plpFloor = history.length >= Math.round(fps * 6.5) ? 0.048 : 0.058
    if (bestI < 0 || !Number.isFinite(bestVal) || bestVal < plpFloor) {
      return null
    }

    const bestLag = minLag + bestI
    const bpmRaw = (60 * fps) / bestLag
    const normalized = this.normalizeTempoBpm(bpmRaw, this.getPreferredTempoReference())
    if (normalized === null) {
      return null
    }

    const prominence = secondVal > -Infinity ? bestVal - secondVal : bestVal
    const confidence = clamp01(
      clamp01((bestVal - plpFloor) / 0.17) * 0.72 +
        clamp01(prominence / 0.09) * 0.28
    )
    return { bpm: normalized, confidence }
  }

  private getBeatTapHintStrength(wallMs: number): number {
    const s = normalizeAudioInputSettings(this.lastSettings ?? undefined)
    if (s.beatTapHintBpm === null || !Number.isFinite(s.beatTapHintBpm)) {
      return 0
    }
    if (s.beatTapHintAtMs <= 0 || !Number.isFinite(s.beatTapHintAtMs)) {
      return 0
    }
    const age = wallMs - s.beatTapHintAtMs
    if (!Number.isFinite(age) || age < 0 || age > 96000) {
      return 0
    }
    if (age < 10000) {
      return 1
    }
    return clamp01(Math.exp(-(age - 10000) / 26000))
  }

  private getUserTapReferenceForNormalize(): number | null {
    const s = normalizeAudioInputSettings(this.lastSettings ?? undefined)
    if (s.beatTapHintBpm === null || !Number.isFinite(s.beatTapHintBpm)) {
      return null
    }
    if (this.getBeatTapHintStrength(Date.now()) < 0.1) {
      return null
    }
    return s.beatTapHintBpm
  }

  private getPreferredTempoReference(): number | null {
    // Prefer tap-teach, then blended autocorr+PLP (stable global tempo), then the
    // interval-based estimate so half/double-time octave errors resolve toward
    // the periodicity trackers instead of the other way around.
    return (
      this.getUserTapReferenceForNormalize() ??
      this.getBlendedPeriodicBpm() ??
      this.bpmEstimate ??
      this.autocorrTempoBpm ??
      this.plpTempoBpm ??
      null
    )
  }

  private getBlendedPeriodicBpm(): number | null {
    const wall = Date.now()
    const tapStr = this.getBeatTapHintStrength(wall)
    const tapBpm = normalizeAudioInputSettings(this.lastSettings ?? undefined).beatTapHintBpm

    const a = this.autocorrTempoBpm
    const p = this.plpTempoBpm
    const aOk = a !== null && Number.isFinite(a)
    const pOk = p !== null && Number.isFinite(p)
    let base: number | null = null
    if (aOk && pOk) {
      const w = clamp01(0.2 + 0.62 * this.plpTempoConfidence)
      base = a! * (1 - w) + p! * w
    } else if (pOk) {
      base = p
    } else if (aOk) {
      base = a
    }

    if (base === null) {
      if (tapStr > 0.12 && tapBpm !== null) {
        return tapBpm
      }
      return null
    }
    if (tapStr > 0.08 && tapBpm !== null) {
      const u = clamp01(0.16 + 0.45 * tapStr)
      return base * (1 - u) + tapBpm * u
    }
    return base
  }

  private normalizeTempoBpm(
    rawBpm: number | null,
    referenceHint?: number | null
  ): number | null {
    if (rawBpm === null || !Number.isFinite(rawBpm) || rawBpm <= 0) {
      return null
    }

    const base = rawBpm
    const candidates = [base, base * 2, base * 0.5]
      .filter((value) => value >= 45 && value <= 220)

    if (candidates.length <= 0) {
      return null
    }

    if (
      referenceHint !== null &&
      referenceHint !== undefined &&
      Number.isFinite(referenceHint) &&
      referenceHint >= 45 &&
      referenceHint <= 220
    ) {
      let best = candidates[0]!
      let bestDelta = Math.abs(best - referenceHint)
      for (let i = 1; i < candidates.length; i++) {
        const candidate = candidates[i]!
        const delta = Math.abs(candidate - referenceHint)
        if (delta < bestDelta) {
          best = candidate
          bestDelta = delta
        }
      }
      return best
    }

    const current = this.bpmEstimate
    const autocorr =
      this.autocorrTempoBpm !== null && Number.isFinite(this.autocorrTempoBpm)
        ? this.autocorrTempoBpm
        : null
    const shouldTrustAutocorrHarmonic =
      current !== null &&
      autocorr !== null &&
      this.autocorrTempoConfidence >= 0.16 &&
      ((autocorr / Math.max(1, current) >= 1.8 &&
        autocorr / Math.max(1, current) <= 2.2) ||
        (autocorr / Math.max(1, current) >= 0.45 &&
          autocorr / Math.max(1, current) <= 0.56))
    const referenceTempo =
      shouldTrustAutocorrHarmonic && autocorr !== null ? autocorr : current
    if (referenceTempo !== null && Number.isFinite(referenceTempo)) {
      let best = candidates[0]
      let bestDelta = Math.abs(best - referenceTempo)
      for (let i = 1; i < candidates.length; i++) {
        const candidate = candidates[i]
        const delta = Math.abs(candidate - referenceTempo)
        if (delta < bestDelta) {
          best = candidate
          bestDelta = delta
        }
      }
      return best
    }

    // Initial lock bias toward dance-tempo center while still allowing slower songs.
    let best = candidates[0]
    let bestScore = Math.abs(best - 120)
    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i]
      const score = Math.abs(candidate - 120)
      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }
    return best
  }

  private getBeatIntervalStabilityConfidence() {
    if (this.recentBeatIntervalsMs.length < 4) {
      return 0
    }
    const median = this.getMedian(this.recentBeatIntervalsMs)
    if (median === null || !Number.isFinite(median) || median <= 0) {
      return 0
    }
    const absDeviations = this.recentBeatIntervalsMs.map((value) =>
      Math.abs(value - median)
    )
    const mad = this.getMedian(absDeviations)
    if (mad === null || !Number.isFinite(mad)) {
      return 0
    }
    const normalizedMad = mad / Math.max(1, median)
    return clamp01(1 - normalizedMad / 0.16)
  }

  private computeBpmConfidence(
    stabilizedBpm: number | null,
    nowMs: number,
    beatDetected: boolean,
    inputLevel: number,
    broadEnergy: number,
    dtSec: number
  ) {
    if (stabilizedBpm === null || !Number.isFinite(stabilizedBpm)) {
      this.bpmConfidenceEma *= 0.94
      return this.bpmConfidenceEma
    }

    const intervalStability = this.getBeatIntervalStabilityConfidence()
    const periodicityBlend = clamp01(
      this.autocorrTempoConfidence * 0.58 + this.plpTempoConfidence * 0.42
    )
    let periodicityDisagree = 0
    if (
      this.autocorrTempoBpm !== null &&
      this.plpTempoBpm !== null &&
      Number.isFinite(this.autocorrTempoBpm) &&
      Number.isFinite(this.plpTempoBpm)
    ) {
      const d = Math.abs(this.autocorrTempoBpm - this.plpTempoBpm)
      periodicityDisagree = clamp01((d - 4) / 22) * 0.28
    }
    const onsetConfidence = clamp01(
      periodicityBlend * 0.82 + intervalStability * 0.18 - periodicityDisagree
    )
    const signalConfidence = clamp01(
      (Math.max(inputLevel, broadEnergy) - 0.006) / 0.13
    )
    const periodMs = 60000 / Math.max(1, stabilizedBpm)
    const sinceLastBeatMs =
      this.lastBeatAtMs > 0 && Number.isFinite(this.lastBeatAtMs)
        ? nowMs - this.lastBeatAtMs
        : Number.POSITIVE_INFINITY
    const recencyConfidence = Number.isFinite(sinceLastBeatMs)
      ? clamp01(
          1 -
            Math.max(0, sinceLastBeatMs - periodMs * 0.18) /
              Math.max(60, periodMs * 2)
        )
      : 0
    const periodicRef = this.getBlendedPeriodicBpm()
    const agreementConfidence =
      this.bpmEstimate !== null &&
      periodicRef !== null &&
      Number.isFinite(this.bpmEstimate) &&
      Number.isFinite(periodicRef)
        ? clamp01(1 - Math.abs(this.bpmEstimate - periodicRef) / 32)
        : 0.5
    const beatBoost = beatDetected ? 0.09 : 0
    const plpBoost =
      this.plpTempoConfidence > 0.42 && periodicityDisagree < 0.06 ? 0.05 : 0

    const tapHintBpm = normalizeAudioInputSettings(
      this.lastSettings ?? undefined
    ).beatTapHintBpm
    const tapStrConf = this.getBeatTapHintStrength(nowMs)
    let tapAgreeBoost = 0
    if (
      tapStrConf > 0.08 &&
      tapHintBpm !== null &&
      stabilizedBpm !== null &&
      Math.abs(stabilizedBpm - tapHintBpm) < 6.5
    ) {
      tapAgreeBoost = tapStrConf * 0.14
    }

    const rawConfidence = clamp01(
      onsetConfidence * 0.42 +
        signalConfidence * 0.18 +
        recencyConfidence * 0.2 +
        agreementConfidence * 0.2 +
        beatBoost +
        plpBoost +
        tapAgreeBoost
    )

    const alpha = clamp01(dtSec / (beatDetected ? 0.2 : 0.55))
    this.bpmConfidenceEma += (rawConfidence - this.bpmConfidenceEma) * alpha
    return clamp01(this.bpmConfidenceEma)
  }

  private updateStabilizedBpmEstimate(
    rawBpm: number | null,
    beatDetected: boolean,
    dtSec: number,
    nowMs: number
  ) {
    if (rawBpm === null || !Number.isFinite(rawBpm) || rawBpm < 45 || rawBpm > 220) {
      if (
        this.stabilizedBpmEstimate !== null &&
        nowMs - this.stabilizedBpmLastAtMs > 2200
      ) {
        this.stabilizedBpmEstimate = null
      }
      return this.stabilizedBpmEstimate
    }

    if (
      this.stabilizedBpmEstimate === null ||
      !Number.isFinite(this.stabilizedBpmEstimate)
    ) {
      this.stabilizedBpmEstimate = rawBpm
      this.stabilizedBpmLastAtMs = nowMs
      return rawBpm
    }

    const safeDtSec = Math.max(1 / 240, dtSec)
    const steerFollow = clamp01(this.bpmConfidenceEma)
    const deltaAbs = Math.abs(rawBpm - this.stabilizedBpmEstimate)
    const changeNorm = clamp01((deltaAbs - 1.25) / 18)
    const rateBoost = lerp(0.88, 1.14, steerFollow)
    const maxRateBpmPerSec =
      (beatDetected ? lerp(16, 52, changeNorm) : lerp(7, 22, changeNorm)) * rateBoost
    const maxStep = maxRateBpmPerSec * safeDtSec
    const delta = rawBpm - this.stabilizedBpmEstimate
    const stepped =
      Math.abs(delta) <= maxStep
        ? rawBpm
        : this.stabilizedBpmEstimate + Math.sign(delta) * maxStep
    const alpha = beatDetected ? lerp(0.32, 0.68, changeNorm) : lerp(0.18, 0.4, changeNorm)
    this.stabilizedBpmEstimate += (stepped - this.stabilizedBpmEstimate) * alpha
    this.stabilizedBpmLastAtMs = nowMs
    return this.stabilizedBpmEstimate
  }
}
