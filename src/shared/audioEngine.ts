export const AUDIO_MIN_BAND_HZ = 20
export const AUDIO_MAX_BAND_HZ = 20000
export const AUDIO_MIN_GAIN = 0
export const AUDIO_MAX_GAIN = 4
export const AUDIO_INPUT_DEVICE_DESKTOP = '__desktop_loopback__'
export const AUDIO_MIN_BEAT_INTERVAL_MS = 120
export const AUDIO_MAX_BEAT_INTERVAL_MS = 800
export const AUDIO_MIN_BPM_SMOOTHING = 0.05
export const AUDIO_MAX_BPM_SMOOTHING = 0.95

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function lerpValue(from: number, to: number, t: number) {
  return from + (to - from) * clamp01(t)
}

/**
 * Maps tempo to an energy contribution (0–1).
 * ~70 ballad/ambient → low, ~120 pop/house → mid, ~140+ techno/DnB → high.
 */
export function bpmToEnergyContribution(bpm: number): number {
  const clamped = clamp(bpm, 55, 200)
  const normalized =
    Math.log(clamped / 55) / Math.log(200 / 55)
  return clamp01(0.04 + Math.pow(clamp01(normalized), 0.82) * 0.9)
}

export interface PerceivedEnergyInput {
  /** Loudness / spectral envelope after adaptive normalization (0–1). */
  spectralEnergy: number
  bpm: number | null
  bpmConfidence: number
  /** Mid+high onset share — dance, rock, and pop vs sustained bass/drone. */
  rhythmShare: number
  beatPulse: number
  fastBreakdown?: boolean
}

/**
 * Combines loudness, tempo, and rhythmic activity for scene matching and meters.
 * Tuned so slow/quiet material reads lower than equally loud but faster, percussive tracks.
 */
export function computePerceivedEnergyLevel(input: PerceivedEnergyInput): number {
  const spectral = clamp01(input.spectralEnergy)
  const conf = clamp01(input.bpmConfidence)
  const rhythmShare = clamp01(input.rhythmShare)
  const beatPulse = clamp01(input.beatPulse)
  const fastBreakdown = input.fastBreakdown === true

  const rawBpm =
    input.bpm !== null && Number.isFinite(input.bpm) && input.bpm > 0
      ? input.bpm
      : null
  const bpmContribution =
    rawBpm === null ? 0.42 : bpmToEnergyContribution(rawBpm)
  const bpmFactor = lerpValue(0.42, bpmContribution, conf)

  const rhythmFactor = clamp01(rhythmShare * 0.68 + beatPulse * 0.32)
  const activityGate = clamp01((spectral - 0.035) / 0.2)
  const genreActivity =
    clamp01(rhythmShare * 0.55 + spectral * 0.45) * activityGate

  let bpmWeight = lerpValue(0.12, 0.28, conf)
  let rhythmWeight = 0.12 + genreActivity * 0.1
  if (fastBreakdown) {
    bpmWeight *= 0.35
    rhythmWeight *= 0.45
  }

  const spectralWeight = Math.max(
    0.48,
    1 - bpmWeight * activityGate - rhythmWeight * activityGate
  )

  return clamp01(
    spectral * spectralWeight +
      bpmFactor * bpmWeight * activityGate +
      rhythmFactor * rhythmWeight * activityGate
  )
}

/** Tempo used for energy: detected when confident, otherwise Link/session BPM. */
export function resolveEnergyTempoBpm(
  detectedBpm: number | null,
  detectedConfidence: number,
  linkBpm: number | null,
  linkEnabled: boolean
): number {
  const conf = clamp01(detectedConfidence)
  if (
    detectedBpm !== null &&
    Number.isFinite(detectedBpm) &&
    detectedBpm >= 45 &&
    conf >= 0.28
  ) {
    return clamp(detectedBpm, 55, 200)
  }
  if (
    linkEnabled &&
    linkBpm !== null &&
    Number.isFinite(linkBpm) &&
    linkBpm >= 45
  ) {
    return clamp(linkBpm, 55, 200)
  }
  if (detectedBpm !== null && Number.isFinite(detectedBpm) && detectedBpm >= 45) {
    return clamp(detectedBpm, 55, 200)
  }
  if (linkBpm !== null && Number.isFinite(linkBpm) && linkBpm >= 45) {
    return clamp(linkBpm, 55, 200)
  }
  return 120
}

export interface AudioInputSettings {
  enabled: boolean
  deviceId: string
  inputGain: number
  useBeatClock: boolean
  beatSensitivity: number
  beatMinIntervalMs: number
  bpmSmoothing: number
  /** User tap-teach hint for beat/BPM learning (renderer; cleared on project load). */
  beatTapHintBpm: number | null
  /** Wall-clock ms when `beatTapHintBpm` was set (from `Date.now()`). */
  beatTapHintAtMs: number
}

export function initAudioInputSettings(): AudioInputSettings {
  return {
    enabled: false,
    deviceId: '',
    inputGain: 1,
    useBeatClock: false,
    beatSensitivity: 0.45,
    beatMinIntervalMs: 260,
    bpmSmoothing: 0.12,
    beatTapHintBpm: null,
    beatTapHintAtMs: 0,
  }
}

export function normalizeAudioInputSettings(
  raw: Partial<AudioInputSettings> | undefined
): AudioInputSettings {
  const defaults = initAudioInputSettings()
  const source = raw ?? {}
  return {
    enabled: source.enabled === true,
    deviceId: typeof source.deviceId === 'string' ? source.deviceId.trim() : '',
    inputGain: clamp(
      Number.isFinite(source.inputGain) ? Number(source.inputGain) : defaults.inputGain,
      AUDIO_MIN_GAIN,
      AUDIO_MAX_GAIN
    ),
    useBeatClock: source.useBeatClock === true,
    beatSensitivity: clamp01(
      Number.isFinite(source.beatSensitivity)
        ? Number(source.beatSensitivity)
        : defaults.beatSensitivity
    ),
    beatMinIntervalMs: Math.round(
      clamp(
        Number.isFinite(source.beatMinIntervalMs)
          ? Number(source.beatMinIntervalMs)
          : defaults.beatMinIntervalMs,
        AUDIO_MIN_BEAT_INTERVAL_MS,
        AUDIO_MAX_BEAT_INTERVAL_MS
      )
    ),
    bpmSmoothing: clamp(
      Number.isFinite(source.bpmSmoothing)
        ? Number(source.bpmSmoothing)
        : defaults.bpmSmoothing,
      AUDIO_MIN_BPM_SMOOTHING,
      AUDIO_MAX_BPM_SMOOTHING
    ),
    beatTapHintBpm:
      source.beatTapHintBpm != null &&
      Number.isFinite(source.beatTapHintBpm) &&
      source.beatTapHintBpm >= 45 &&
      source.beatTapHintBpm <= 220
        ? source.beatTapHintBpm
        : null,
    beatTapHintAtMs:
      source.beatTapHintAtMs != null &&
      Number.isFinite(source.beatTapHintAtMs) &&
      source.beatTapHintAtMs > 0
        ? source.beatTapHintAtMs
        : 0,
  }
}

export interface AudioEngineMetrics {
  enabled: boolean
  inputLevel: number
  energyLevel: number
  beatPulse: number
  beatDetected: boolean
  detectedBpm: number | null
  detectedBpmConfidence: number
  spectrum: number[]
  nyquistHz: number
  updatedAtMs: number
}

export function initAudioEngineMetrics(): AudioEngineMetrics {
  return {
    enabled: false,
    inputLevel: 0,
    energyLevel: 0,
    beatPulse: 0,
    beatDetected: false,
    detectedBpm: null,
    detectedBpmConfidence: 0,
    spectrum: [],
    nyquistHz: 24000,
    updatedAtMs: 0,
  }
}

export function normalizeAudioEngineMetrics(
  raw: Partial<AudioEngineMetrics> | undefined
): AudioEngineMetrics {
  const defaults = initAudioEngineMetrics()
  const source = raw ?? {}
  const detectedBpm = Number(source.detectedBpm)
  const detectedBpmConfidence = Number(source.detectedBpmConfidence)
  const spectrum = Array.isArray(source.spectrum)
    ? source.spectrum
        .map((value) => clamp01(Number(value)))
        .slice(0, 1024)
    : defaults.spectrum

  return {
    enabled: source.enabled === true,
    inputLevel: clamp01(Number(source.inputLevel)),
    energyLevel: clamp01(Number(source.energyLevel)),
    beatPulse: clamp01(Number(source.beatPulse)),
    beatDetected: source.beatDetected === true,
    detectedBpm:
      Number.isFinite(detectedBpm) && detectedBpm > 0 ? detectedBpm : null,
    detectedBpmConfidence: clamp01(detectedBpmConfidence),
    spectrum,
    nyquistHz: clamp(
      Number(source.nyquistHz),
      1000,
      AUDIO_MAX_BAND_HZ
    ),
    updatedAtMs: Number.isFinite(source.updatedAtMs)
      ? Number(source.updatedAtMs)
      : defaults.updatedAtMs,
  }
}

export interface AudioBandConfig {
  lowHz: number
  highHz: number
  gain: number
}

/** Cutoff slider bounds shown on Audio Band LFO shape controls (matches modulator UI). */
export function getAudioBandCutoffSliderBounds(nyquistHz: number) {
  const nyquistCapHz = Math.max(
    AUDIO_MIN_BAND_HZ + 40,
    Math.min(
      AUDIO_MAX_BAND_HZ,
      Number.isFinite(nyquistHz) ? Math.round(nyquistHz) : AUDIO_MAX_BAND_HZ
    )
  )
  const lowCutMinHz = AUDIO_MIN_BAND_HZ
  const lowCutMaxHz = Math.max(
    lowCutMinHz + 20,
    Math.min(12000, nyquistCapHz - 20)
  )
  const highCutMinHz = Math.max(40, AUDIO_MIN_BAND_HZ + 20)
  const highCutMaxHz = nyquistCapHz
  return { lowCutMinHz, lowCutMaxHz, highCutMinHz, highCutMaxHz }
}

export function initAudioBandConfig(): AudioBandConfig {
  return {
    lowHz: 120,
    highHz: 2000,
    gain: 1,
  }
}

export function normalizeAudioBandConfig(
  raw: Partial<AudioBandConfig> | undefined
): AudioBandConfig {
  const defaults = initAudioBandConfig()
  const lowHz = clamp(
    Number.isFinite(raw?.lowHz) ? Number(raw?.lowHz) : defaults.lowHz,
    AUDIO_MIN_BAND_HZ,
    AUDIO_MAX_BAND_HZ
  )
  const highHz = clamp(
    Number.isFinite(raw?.highHz) ? Number(raw?.highHz) : defaults.highHz,
    AUDIO_MIN_BAND_HZ,
    AUDIO_MAX_BAND_HZ
  )
  return {
    lowHz: Math.min(lowHz, highHz),
    highHz: Math.max(lowHz, highHz),
    gain: clamp(
      Number.isFinite(raw?.gain) ? Number(raw?.gain) : defaults.gain,
      AUDIO_MIN_GAIN,
      AUDIO_MAX_GAIN
    ),
  }
}

export function getAudioBandLevel(
  audio: AudioEngineMetrics,
  band: AudioBandConfig
): number {
  if (!audio.enabled || audio.spectrum.length === 0 || audio.nyquistHz <= 0) {
    return 0
  }

  const normalizedBand = normalizeAudioBandConfig(band)
  const length = audio.spectrum.length
  const binFrequency = audio.nyquistHz / Math.max(1, length - 1)

  const lowIndex = Math.max(
    0,
    Math.min(length - 1, Math.floor(normalizedBand.lowHz / binFrequency))
  )
  const highIndex = Math.max(
    lowIndex,
    Math.min(length - 1, Math.ceil(normalizedBand.highHz / binFrequency))
  )

  let sum = 0
  let count = 0
  for (let i = lowIndex; i <= highIndex; i++) {
    sum += audio.spectrum[i] ?? 0
    count++
  }

  if (count <= 0) {
    return 0
  }

  const average = sum / count
  return clamp01(average * normalizedBand.gain)
}
