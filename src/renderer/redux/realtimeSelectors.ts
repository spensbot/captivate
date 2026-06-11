import type { AudioEngineMetrics } from '../../shared/audioEngine'
import { useRealtimeSelector } from './realtimeStore'

/** Fields that affect LFO / inter-mod audio evaluation (not inputLevel alone). */
function lfoAudioMetricsEqual(
  a: AudioEngineMetrics,
  b: AudioEngineMetrics
): boolean {
  if (
    a.enabled !== b.enabled ||
    a.energyLevel !== b.energyLevel ||
    a.nyquistHz !== b.nyquistHz ||
    a.beatPulse !== b.beatPulse ||
    a.updatedAtMs !== b.updatedAtMs
  ) {
    return false
  }
  if (a.spectrum.length !== b.spectrum.length) {
    return false
  }
  if (a.spectrum === b.spectrum) {
    return true
  }
  for (let i = 0; i < a.spectrum.length; i++) {
    if (a.spectrum[i] !== b.spectrum[i]) {
      return false
    }
  }
  return true
}

export function useLfoBeats(): number {
  return useRealtimeSelector((state) => state.time.beats)
}

export function useLfoAudioMetrics(): AudioEngineMetrics {
  return useRealtimeSelector((state) => state.audio, lfoAudioMetricsEqual)
}

export function useAudioNyquistHz(): number {
  return useRealtimeSelector((state) => state.audio.nyquistHz)
}
