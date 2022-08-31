export interface TimeState {
  bpm: number
  beats: number

  // Link
  numPeers: number
  isEnabled: boolean
  isPlaying: boolean
  isStartStopSyncEnabled: boolean
  quantum: number

  // Live Audio Analysis
  rms: number
  confidence: number
  confidenceThreshold: number
}

export function initTimeState(): TimeState {
  return {
    bpm: 90.0, // (from LINK)
    beats: 0.0, // running total of beats (from LINK)
    numPeers: 0,
    isEnabled: false,
    isPlaying: false,
    isStartStopSyncEnabled: false,
    quantum: 4.0,
    rms: 0.0,
    confidence: 0.0,
    confidenceThreshold: 0.5,
  }
}

export type Beats = number

export function isNewPeriod(beatsLast: Beats, beatsNow: Beats, period: Beats) {
  const beatDelta = beatsNow - beatsLast
  return beatsNow % period < beatDelta
}

export function beatsIn(beatsNow: Beats, period: Beats) {
  return beatsNow % period
}

export function beatsLeft(beatsNow: Beats, period: Beats) {
  return period - beatsIn(beatsNow, period)
}

export class PeriodTracker {
  private beatsLast: Beats
  constructor() {
    this.beatsLast = Date.now()
  }
  isNewPeriod(beats: Beats, targetPeriod: Beats) {
    const beatDelta = beats - this.beatsLast
    this.beatsLast = beats
    return beats % targetPeriod < beatDelta
  }
}
