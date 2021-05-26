import { TimeState } from '../redux/realtimeStore'

export type Beats = number

export function isNewPeriod(ts: TimeState, period: Beats) {
  const dtMinutes = ts.dt / 60000
  const dtBeats = dtMinutes * ts.bpm
  return (ts.beats % period) < dtBeats
}