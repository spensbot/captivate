const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60

export default class Duration {
  private ms: number

  private constructor(ms: number) {
    this.ms = ms
  }

  public static from_ms(ms: number): Duration {
    return new Duration(ms)
  }
  public static from_secs(secs: number): Duration {
    return new Duration(secs * MS_PER_SECOND)
  }
  public static from_minutes(minutes: number): Duration {
    return new Duration(minutes * MS_PER_MINUTE)
  }
  public static from_hours(hours: number): Duration {
    return new Duration(hours * MS_PER_HOUR)
  }

  to_ms(): number {
    return this.ms
  }
  to_secs(): number {
    return this.ms / MS_PER_SECOND
  }
  to_minutes(): number {
    return this.ms / MS_PER_MINUTE
  }
  to_hours(): number {
    return this.ms / MS_PER_HOUR
  }

  times(val: number): Duration {
    return new Duration(this.ms * val)
  }
  less_than(other: Duration): boolean {
    return this.ms < other.ms
  }

  print(): string {
    let ms = this.ms
    if (ms >= MS_PER_HOUR) {
      return `${ms / MS_PER_HOUR} hours`
    } else if (ms >= MS_PER_MINUTE) {
      return `${ms / MS_PER_MINUTE} mins`
    } else if (ms >= MS_PER_SECOND) {
      return `${ms / MS_PER_SECOND} secs`
    } else {
      return `${ms} ms`
    }
  }
}
