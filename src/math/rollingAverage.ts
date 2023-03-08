import { clampNormalized } from './util'

export class RollingAverage {
  private average = 0
  private newWeight = 1.0
  private oldWeight = 0.0

  constructor(sampleRate: number, sustainSeconds: number) {
    this.setSustainSamples(sampleRate * sustainSeconds)
  }

  setSustainSamples(sustainSamples: number) {
    if (sustainSamples < 1) {
      this.newWeight = 1.0
      this.oldWeight = 0.0
    } else {
      this.newWeight = 1.0 / sustainSamples
      this.oldWeight = 1.0 - this.newWeight
    }
  }

  push(sample: number) {
    this.average = this.newWeight * sample + this.oldWeight * this.average
  }

  get(): number {
    return this.average
  }

  reset() {
    this.average = 0.0
  }
}

/** Similar to rolling average, but the average reacts differently to values above/below the current average. */
export class RollingAverageBiased {
  private average = 0.0
  private weightUpNew = 1.0
  private weightUpOld = 1.0
  private weightDownNew = 0.0
  private weightDownOld = 0.0

  constructor(sampleRate: number, riseSeconds: number, fallSeconds: number) {
    this.setSustainSamples(riseSeconds * sampleRate, fallSeconds * sampleRate)
  }

  setSustainSamples(riseSamples: number, fallSamples: number) {
    if (riseSamples < 1.0) {
      this.weightUpNew = 1.0
      this.weightUpOld = 0.0
    } else {
      this.weightUpNew = 1.0 / riseSamples
      this.weightUpOld = 1.0 - this.weightUpNew
    }
    if (fallSamples < 1.0) {
      this.weightDownNew = 1.0
      this.weightDownOld = 0.0
    } else {
      this.weightDownNew = 1.0 / fallSamples
      this.weightDownOld = 1.0 - this.weightDownNew
    }
  }

  push(sample: number) {
    if (sample > this.average) {
      // Average moves up
      this.average = this.weightUpNew * sample + this.weightUpOld * this.average
    } else {
      // Average moves down
      this.average =
        this.weightDownNew * sample + this.weightDownOld * this.average
    }
  }

  get() {
    return this.average
  }
}

export class RollingRange {
  private min: RollingAverageBiased
  private max: RollingAverageBiased

  constructor(
    sampleRate: number,
    expandSeconds: number,
    contractSeconds: number
  ) {
    this.min = new RollingAverageBiased(
      sampleRate,
      contractSeconds,
      expandSeconds
    )
    this.max = new RollingAverageBiased(
      sampleRate,
      expandSeconds,
      contractSeconds
    )
  }

  push(sample: number) {
    this.min.push(sample)
    this.max.push(sample)
  }

  getMin(): number {
    return this.min.get()
  }

  getMax(): number {
    return this.max.get()
  }

  getRange(): number {
    return this.max.get() - this.min.get()
  }

  getRatio(val: number): number {
    return clampNormalized((val - this.getMin()) / this.getRange())
  }
}
