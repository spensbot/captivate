import Duration from './Duration'

const MIN_DURATION = Duration.from_hours(1)
const INTERVAL_MS = 1000

export default class CachedVal<T> {
  id: string
  backupDurations: Duration[]

  private constructor(id: string) {
    this.id = id
    this.backupDurations = getBackupDurations()
  }

  load(lookback: Duration, fixVal: (val: T) => void): T {
    let bd = this.backupDurations
    let closestDuration =
      bd.find((dur) => lookback.less_than(dur)) ?? bd[bd.length - 1]
    let id = this.backupId(closestDuration)
    let serializedVal = localStorage.getItem(id)
    if (serializedVal === null) throw Error(`localStorage item not found ${id}`)
    return deserialize(serializedVal, fixVal)
  }

  public static create<T>(
    id: string,
    init: T,
    get_current: () => T
  ): [CachedVal<T>, T | null] {}

  backupId(duration: Duration) {
    return `${this.id}-${duration.to_ms()}ms`
  }
}

function serialize<T>(val: T): string {
  return JSON.stringify(val)
}

function deserialize<T>(valString: string, fixVal: (val: T) => void): T {
  let val = JSON.parse(valString)
  fixVal(val)
  return val as T
}

function updateEvery(duration: Duration) {
  return Math.log2(duration.to_ms())
}

function getBackupDurations(): Duration[] {
  let ret = []
  let duration = Duration.from_ms(INTERVAL_MS)
  while (duration.less_than(MIN_DURATION)) {
    ret.push(duration)
    duration = duration.times(2)
  }
  return ret
}
