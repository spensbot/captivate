import { SessionState } from 'node-audio'

function initSessionState(): SessionState {
  return {
    bpm: 120,
    beats: 0,
    rms: 0,
    rms_l: 0,
    rms_r: 0,
    lrBalance: 0.5,
    pitch: 0,
    pitchConfidence: 0,
    bpmConfidence: 0,
    bpmConfidenceThreshold: 0,
    bpmUnconfident: 0,
    phaseVocoder: [],
  }
}

interface LinkState {
  numPeers: number
  isEnabled: boolean
  isPlaying: boolean
  isStartStopSyncEnabled: boolean
  quantum: number
}

function initLinkState(): LinkState {
  return {
    numPeers: 0,
    isEnabled: false,
    isPlaying: false,
    isStartStopSyncEnabled: false,
    quantum: 4.0,
  }
}

export interface TimeState {
  bpm: number
  beats: number
  link: LinkState
  audio: SessionState
}

export function initTimeState(): TimeState {
  return {
    bpm: 90.0, // (from LINK)
    beats: 0.0, // running total of beats (from LINK)
    link: initLinkState(),
    audio: initSessionState(),
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
