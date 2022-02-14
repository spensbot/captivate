export interface TimeState {
  bpm: number
  beats: number
  phase: number
  numPeers: number
  isEnabled: boolean
  quantum: number
  dt: number
}

export function initTimeState(): TimeState {
  return {
    bpm: 90.0, // (from LINK)
    beats: 0.0, // running total of beats (from LINK)
    phase: 0.0, // from 0.0 to quantum (from LINK)
    numPeers: 0,
    isEnabled: false,
    quantum: 4.0,
    dt: 0.0,
  }
}

export type Beats = number

// export function isNewPeriod(ts: TimeState, period: Beats) {
//   const dtMinutes = ts.dt / 60000
//   const dtBeats = dtMinutes * ts.bpm
//   return ts.beats % period < dtBeats
// }

export function isNewPeriod(
  beatsLast: Beats,
  beatsNow: Beats,
  beatsPerPeriod: Beats
) {
  const beatDelta = beatsNow - beatsLast
  return beatsNow % beatsPerPeriod < beatDelta
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
