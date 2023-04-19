import { skewPower } from '../../../utils/math/skew'

export class Strobe {
  // Resets to 1, then is decremented according to strobe speed
  private countdown: number = 1
  private isOn: boolean = true
  private min_ms: number

  constructor(min_ms?: number) {
    this.min_ms = min_ms ?? 50
  }

  //dt: ms
  //speed: number between 0 and 1
  update(dt: number, speed: number) {
    if (speed < 0.1) {
      this.isOn = true
      this.countdown = 1
    } else {
      this.countdown -= (speed * dt) / this.min_ms
      if (this.countdown < 0.1) {
        this.isOn = !this.isOn
        this.countdown = 1
      }
    }
    return this.isOn ? 1 : 0
  }
}

export class Wobble {
  private bound: number
  private elapsed: number = 0

  constructor(bound?: number) {
    this.bound = bound ?? Math.PI / 3
  }

  update(dt: number, speed: number) {
    this.elapsed += (dt * skewPower(speed, 0.6) + 0.5) / 300
    return Math.sin(this.elapsed) * this.bound
  }
}

export class Spin {
  private elapsed: number = 0

  update(dt: number, speed: number) {
    this.elapsed += (dt * skewPower(speed, 0.6) + 0.5) / 300
    return this.elapsed
  }
}
