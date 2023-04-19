export default class RollingAverage {
  private average: number
  private newWeight = 1
  private oldWeight = 0

  constructor(init: number) {
    this.average = init
  }

  setSustainSamples(sustainSamples: number) {
    if (sustainSamples < 1.0) {
      this.newWeight = 1.0
      this.oldWeight = 0.0
    } else {
      this.newWeight = 1.0 / sustainSamples
      this.oldWeight = 1.0 - this.newWeight
    }
  }

  setSustainSeconds(sampleRate: number /* samples per second */, sustainSeconds: number) {
    this.setSustainSamples(sampleRate * sustainSeconds)
  }

  push(sample: number) {
    this.average = this.newWeight * sample + this.oldWeight * this.average
  }

  get() {
    return this.average
  }

  reset(newAverage: number) {
    this.average = newAverage
  }
}

// A rolling average that dynamically updates sustain samples 
// based on the ratio between the pushed sample and the current average
export class DynamicSustainRollingAverage {
  private rollingAverage: RollingAverage
  private getSustainSamples: (ratio: number) => number

  constructor(init: number, getSustainSamples: (ratio: number) => number) {
    this.rollingAverage = new RollingAverage(init)
    this.getSustainSamples = getSustainSamples
  }

  push(sample: number) {
    const dif = Math.abs(sample - this.rollingAverage.get())
    const ref = Math.min(this.rollingAverage.get(), sample)
    const ratio = dif / ref
    this.rollingAverage.setSustainSamples(this.getSustainSamples(ratio))
    this.rollingAverage.push(sample)
  }

  get() {
    return this.rollingAverage.get()
  }

  reset(newAverage: number) {
    this.rollingAverage.reset(newAverage)
  }
}

export function dynamicSustain(maxSustainSamples: number, resetRatio: number) {
  return (ratio: number) => {
    const dif = resetRatio - ratio
    if (dif < 0) {
      return 0
    } else {
      const normalized = dif / resetRatio
      return normalized ** 2 * maxSustainSamples + 1
    }
  }
}