export default class RollingAverage {
  private average: number = 0.0
  private newWeight: number = 1.0
  private oldWeight: number = 0.0

  setSustainSamples(sustainSamples: number) {
    if (sustainSamples < 1.0) {
      this.newWeight = 1.0
      this.oldWeight = 0.0
    } else {
      this.newWeight = 1.0 / sustainSamples
      this.oldWeight = 1.0 - this.newWeight
    }
  }

  setSustainSeconds(sampleRate: number, sustainSeconds: number) {
    this.setSustainSamples(sampleRate * sustainSeconds)
  }

  push(sample: number) {
    this.average = this.newWeight * sample + this.oldWeight * this.average
  }

  get() {
    return this.average
  }

  reset(average: number) {
    this.average = average
  }
}
