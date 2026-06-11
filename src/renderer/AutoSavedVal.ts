import { indexArray } from 'shared/util'
import { logProjectPersistence } from './telemetry/projectPersistenceTelemetry'

const FACTOR = 2
const SLOT_COUNT = 12
const INTERVAL_MS = 5000

interface DatedSave<T> {
  dateStamp: number
  data: T
}

export function printTimePassed(datedSave: DatedSave<any>) {
  let ms = Date.now() - datedSave.dateStamp
  let s = ms / 1000
  if (s < 60) {
    return `${s.toFixed(0)} secs`
  }
  let m = s / 60
  if (m < 60) {
    return `${m.toFixed(0)} mins`
  }
  let h = m / 60
  return `${h.toFixed(0)} hours`
}

export default class AutoSavedVal<T> {
  readonly id: string
  private interval: ReturnType<typeof setInterval> | null = null
  private getCurrent: () => T
  private lastSerializedSnapshot: string | null = null
  private paused = false

  constructor(id: string, getCurrent: () => T) {
    this.id = id
    this.getCurrent = getCurrent
    this.start()
  }

  stop() {
    this.paused = true
    if (this.interval !== null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  start() {
    if (!this.paused && this.interval !== null) {
      return
    }
    this.paused = false
    if (this.interval !== null) {
      clearInterval(this.interval)
    }
    this.interval = setInterval(() => this.updateSaves(), INTERVAL_MS)
  }

  /** Pause periodic localStorage snapshots while file autosave owns persistence. */
  pausePeriodicWrites() {
    this.stop()
    this.paused = true
  }

  resumePeriodicWrites() {
    this.paused = false
    this.start()
  }

  loadAll(): DatedSave<T>[] {
    return saveSlots()
      .map((slot) => localStorage.getItem(this.key(slot)))
      .filter((a) => a !== null)
      .map((str) => deserializeDated(str as string))
  }

  loadLatest(): T | null {
    let latest = this.load(0)
    return latest === null ? null : latest.data
  }

  load(slot: number): DatedSave<T> | null {
    let serialized = localStorage.getItem(this.key(slot))
    return serialized === null ? null : deserializeDated<T>(serialized)
  }

  private key(slot: number) {
    return `${this.id}-cache-${slot}`
  }

  private updateSaves() {
    const run = () => {
      let saveCount = getSaveCount(this.id)

      saveSlots()
        .slice(1)
        .reverse()
        .forEach((slot) => {
          if (saveCount % updateEvery(slot) === 0) {
            let previousSlotString = localStorage.getItem(this.key(slot - 1))
            if (previousSlotString !== null) {
              localStorage.setItem(this.key(slot), previousSlotString)
            }
          }
        })

      this.writeLatest(this.getCurrent())

      setSaveCount(this.id, saveCount + 1)
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run(), { timeout: 2000 })
      return
    }
    run()
  }

  /** Persist the current snapshot immediately (e.g. after manual save/load). */
  flush() {
    this.lastSerializedSnapshot = null
    this.writeLatest(this.getCurrent())
  }

  private writeLatest(data: T) {
    try {
      const serialized = serializeDated(data)
      if (serialized === this.lastSerializedSnapshot) {
        return
      }
      this.lastSerializedSnapshot = serialized
      localStorage.setItem(this.key(0), serialized)
      logProjectPersistence({
        phase: 'autosave_write',
        serializedBytes: serialized.length,
        extra: { slot: 0, autosaveId: this.id },
      })
    } catch (err) {
      console.warn('Autosave write failed.', err)
      logProjectPersistence({
        phase: 'autosave_write_failed',
        level: 'error',
        error: err,
        extra: { slot: 0, autosaveId: this.id },
      })
    }
  }
}

function serializeDated<T>(data: T): string {
  let datedSave: DatedSave<T> = {
    data,
    dateStamp: Date.now(),
  }

  return JSON.stringify(datedSave)
}

function deserializeDated<T>(datedSaveString: string): DatedSave<T> {
  let datedSave = JSON.parse(datedSaveString) as DatedSave<T>
  return datedSave
}

function updateEvery(slot: number) {
  return FACTOR ** slot
}

function setSaveCount(id: string, count: number) {
  localStorage.setItem(saveCountKey(id), count.toFixed(0))
}

function getSaveCount(id: string): number {
  return parseInt(localStorage.getItem(saveCountKey(id)) ?? '0')
}

function saveCountKey(id: string) {
  return `${id}_cache_count`
}

function saveSlots(): number[] {
  return indexArray(SLOT_COUNT)
}

// function slotUpdateTime(slot: number) {
//   return INTERVAL_MS * FACTOR ** slot
// }
