import RollingAverage from '../../shared/RollingAverage'

const SLEEP_TIME = 3000 // milliseconds between taps after which the engine resets
const TAPS_TO_COMMIT = 3 // Number of taps before the bpm is set
const SUSTAIN_SAMPLES = 5 // <- Number of samples the rolling average is averaged over

function getBPM(ms: number) {
  return 60000 / ms
}

export default class TapTempoEngine {
  private avgBPM = new RollingAverage()
  private sessionStartTime = 0
  private sessionTaps = 0
  private lastTapTime = 0

  constructor() {
    this.avgBPM.setSustainSamples(SUSTAIN_SAMPLES)
  }

  tap(setBpm: (newBPM: number) => void) {
    const now = Date.now()
    this.sessionTaps += 1

    if (this.sessionTaps === 1) {
      this.begin_session(now)
    } else if (this.sessionTaps <= TAPS_TO_COMMIT) {
      const sessionTime = now - this.sessionStartTime
      const period = now - this.lastTapTime
      if (period < SLEEP_TIME) {
        if (this.sessionTaps === TAPS_TO_COMMIT) {
          this.avgBPM.reset(getBPM(sessionTime / (TAPS_TO_COMMIT - 1)))
          setBpm(this.avgBPM.get())
        }
      } else {
        this.begin_session(now)
      }
    } else {
      const period = now - this.lastTapTime
      if (period < SLEEP_TIME) {
        this.avgBPM.push(getBPM(period))
        setBpm(this.avgBPM.get())
      } else {
        this.begin_session(now)
      }
    }

    this.lastTapTime = now
  }

  begin_session(now: number) {
    this.sessionTaps = 1
    this.sessionStartTime = now
  }
}
