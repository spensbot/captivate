import {DynamicSustainRollingAverage, dynamicSustain} from '../../shared/RollingAverage'

const BPM_LIMIT = 1000
const SLEEP_TIME = 3000 // milliseconds between taps after which the engine resets
const TAPS_TO_COMMIT = 3 // Number of taps before the bpm is set
const MAX_SUSTAIN_SAMPLES = 5 // <- Number of samples the rolling average is averaged over
const RESET_RATIO = 0.5

function getBPM(ms: number) {
  return 60000 / ms
}

export default class TapTempoEngine {
  private avgBPM = new DynamicSustainRollingAverage(120, dynamicSustain(MAX_SUSTAIN_SAMPLES, RESET_RATIO))
  private sessionStartTime = 0
  private sessionTaps = 0
  private lastTapTime = 0

  tap(setBpm: (newBPM: number) => void, setPhase: (newPhase: number, options: { force: boolean }) => void) {
    const now = Date.now()
    this.sessionTaps += 1

    if (this.sessionTaps === 1) {
      this.begin_session(now)
    } else if (this.sessionTaps <= TAPS_TO_COMMIT) {
      const sessionTime = now - this.sessionStartTime
      const period = now - this.lastTapTime
      if (period < SLEEP_TIME) {
        if (this.sessionTaps === TAPS_TO_COMMIT) {
          let bpm = getBPM(sessionTime / (TAPS_TO_COMMIT - 1))
          if (bpm < BPM_LIMIT) {
            this.avgBPM.reset(bpm)
            setBpm(this.avgBPM.get())
          } else {
            console.warn(`unusally large reset BPM: ${bpm}`)
          }
        }
      } else {
        this.begin_session(now)
      }
    } else {
      const period = now - this.lastTapTime
      if (period < SLEEP_TIME) {
        let bpm = getBPM(period)
        if (bpm < BPM_LIMIT) {
          this.avgBPM.push(bpm)
          setBpm(this.avgBPM.get())
        } else {
          console.warn(`unusally large push BPM: ${bpm}`)
        }
      } else {
        this.begin_session(now)
      }
    }

    const isFirstBeat = this.sessionTaps === 1;
    setPhase(this.sessionTaps - 1, { force: isFirstBeat });

    this.lastTapTime = now
  }

  begin_session(now: number) {
    this.sessionTaps = 1
    this.sessionStartTime = now
  }
}
