import RollingAverage from '../../shared/RollingAverage'

const SLEEP_TIME = getMS(20) // milliseconds after which the tap tempo reset
const SUSTAIN_SAMPLES = 2 // <- Set this to 1 to force the bpm to update immediately

function getBPM(ms: number) {
  return 60000 / ms
}

function getMS(bpm: number) {
  return 60000 / bpm
}

export default class TapTempoEngine {
  private avgBPM = new RollingAverage()
  private lastTapTime = 0
  // private taps = 0

  constructor() {
    this.avgBPM.setSustainSamples(SUSTAIN_SAMPLES)
  }

  tap(currentBPM: number, setBpm: (newBPM: number) => void) {
    const now = Date.now()
    const period = now - this.lastTapTime
    this.lastTapTime = now
    if (period < SLEEP_TIME) {
      this.avgBPM.push(getBPM(period))
      setBpm(this.avgBPM.get())
    } else {
      console.log(`resetting avgBPM: ${currentBPM}`)
      this.avgBPM.reset(currentBPM)
    }
  }
}
