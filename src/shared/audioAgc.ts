/**
 * Broadcast-style automatic gain control for live audio analysis.
 *
 * Uses a slow RMS envelope for level targeting, a fast peak envelope for limiting,
 * and log-domain gain smoothing with asymmetric attack/release (fast gain reduction
 * when loud, slower gain recovery when quiet) to limit pumping.
 */

export interface AudioAgcState {
  /** Slow RMS envelope (linear, 0–1). */
  envelopeRms: number
  /** Fast peak envelope (linear, 0–1). */
  envelopePeak: number
  /** Current AGC multiplier applied on top of manual input gain. */
  gainLinear: number
  logGain: number
}

export interface AudioAgcConfig {
  /** Target RMS level after AGC (≈ −18 dBFS). */
  targetRms: number
  /** Peak ceiling blended into the control signal. */
  targetPeak: number
  /** Ignore boosting when the control level is below this (linear). */
  noiseFloor: number
  /** Minimum AGC multiplier (prevents runaway boost on silence). */
  minGain: number
  /** Maximum AGC multiplier. */
  maxGain: number
  /** Envelope follower time constant for RMS (seconds). */
  rmsEnvelopeTauSec: number
  /** Envelope follower time constant for peak (seconds). */
  peakEnvelopeTauSec: number
  /** Time constant when reducing gain (signal above target). */
  gainAttackTauSec: number
  /** Time constant when increasing gain (signal below target). */
  gainReleaseTauSec: number
}

export const DEFAULT_AUDIO_AGC_CONFIG: AudioAgcConfig = {
  targetRms: 0.12,
  targetPeak: 0.42,
  noiseFloor: 0.0025,
  minGain: 0.25,
  maxGain: 4,
  rmsEnvelopeTauSec: 0.32,
  peakEnvelopeTauSec: 0.012,
  gainAttackTauSec: 0.045,
  gainReleaseTauSec: 0.55,
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function alphaFromTau(dtSec: number, tauSec: number) {
  if (!Number.isFinite(dtSec) || dtSec <= 0) return 0
  return 1 - Math.exp(-dtSec / Math.max(0.001, tauSec))
}

export function initAudioAgcState(): AudioAgcState {
  return {
    envelopeRms: 0,
    envelopePeak: 0,
    gainLinear: 1,
    logGain: 0,
  }
}

function measureBlock(samples: Float32Array | ArrayLike<number>) {
  let sumSq = 0
  let peak = 0
  const n = samples.length
  if (n <= 0) {
    return { rms: 0, peak: 0 }
  }
  for (let i = 0; i < n; i++) {
    const sample = Number(samples[i])
    if (!Number.isFinite(sample)) continue
    const abs = Math.abs(sample)
    if (abs > peak) peak = abs
    sumSq += sample * sample
  }
  return { rms: Math.sqrt(sumSq / n), peak }
}

/**
 * Advance AGC state from a block of **pre-gain** PCM samples and return the new
 * linear gain multiplier (1 = unity).
 */
export function processAudioAgc(
  state: AudioAgcState,
  samples: Float32Array | ArrayLike<number>,
  dtSec: number,
  config: AudioAgcConfig = DEFAULT_AUDIO_AGC_CONFIG
): number {
  const { rms, peak } = measureBlock(samples)
  const rmsAlpha = alphaFromTau(dtSec, config.rmsEnvelopeTauSec)
  const peakAlpha = alphaFromTau(dtSec, config.peakEnvelopeTauSec)

  state.envelopeRms += (rms - state.envelopeRms) * rmsAlpha
  state.envelopePeak += (peak - state.envelopePeak) * peakAlpha

  const controlLevel = Math.max(
    state.envelopeRms,
    state.envelopePeak * 0.55,
    config.noiseFloor
  )

  let desiredGain = config.targetRms / controlLevel

  if (state.envelopePeak > config.targetPeak) {
    const peakLimitGain = config.targetPeak / Math.max(state.envelopePeak, config.noiseFloor)
    desiredGain = Math.min(desiredGain, peakLimitGain)
  }

  if (controlLevel <= config.noiseFloor * 1.4) {
    desiredGain = Math.min(desiredGain, 1.35)
  }

  desiredGain = clamp(desiredGain, config.minGain, config.maxGain)

  const desiredLogGain = Math.log(Math.max(1e-6, desiredGain))
  const increasingGain = desiredLogGain > state.logGain
  const gainTau = increasingGain ? config.gainReleaseTauSec : config.gainAttackTauSec
  const gainAlpha = alphaFromTau(dtSec, gainTau)
  state.logGain += (desiredLogGain - state.logGain) * gainAlpha
  state.gainLinear = clamp(Math.exp(state.logGain), config.minGain, config.maxGain)
  return state.gainLinear
}

/** Combine manual input gain with an AGC multiplier and clamp to engine limits. */
export function combineManualAndAgcGain(
  manualGain: number,
  agcGain: number,
  minTotal: number,
  maxTotal: number
): number {
  return clamp(manualGain * agcGain, minTotal, maxTotal)
}
