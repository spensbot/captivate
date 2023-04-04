import { TimeState, isNewPeriod } from '../features/bpm/shared/TimeState'
import { lerp } from '../features/utils/math/util'

type Normalized = number

export interface Point {
  level: Normalized
  rising: boolean
}

export type RandomizerState = Point[]

export function initRandomizerOptions() {
  return {
    triggerPeriod: 1, // beats
    triggerDensity: 0.3,
    envelopeRatio: 0.1,
    envelopeDuration: 1, // beats
  }
}

export type RandomizerOptions = ReturnType<typeof initRandomizerOptions>

function initPoint(): Point {
  return {
    level: 0,
    rising: false,
  }
}

export function initRandomizerState(): RandomizerState {
  return []
}

export function applyRandomization(
  value: number,
  randomizerLevel: number,
  randomizationAmount: number
) {
  return lerp(value, value * randomizerLevel, randomizationAmount)
}

// returns a new randomizerState with the desired size. Growing or shrinking as necessary
export function resizeRandomizer(state: RandomizerState, size: number) {
  const syncedState: Point[] = []
  Array(size)
    .fill(0)
    .forEach((_, i) => {
      let oldState = state[i]
      syncedState[i] = oldState ?? initPoint()
    })
  return syncedState
}

// returns the desired amount of random indexes
// Each chosen index in unique, which is why this function is so specialized
function pickRandomIndexes(randCount: number, size: number) {
  const randomIndexes: number[] = []
  const availableIndexes = Array.from(Array(size).keys())
  for (let i = 0; i < randCount; i++) {
    const index = Math.floor(Math.random() * availableIndexes.length)
    const randomIndex = availableIndexes[index]
    availableIndexes.splice(index, 1)
    randomIndexes.push(randomIndex)
  }
  return randomIndexes
}

export function updateIndexes(
  beatsLast: number,
  state: RandomizerState,
  ts: TimeState,
  indexes: number[],
  {
    triggerPeriod,
    triggerDensity,
    envelopeRatio,
    envelopeDuration,
  }: RandomizerOptions
) {
  const riseBeats = envelopeDuration * envelopeRatio
  const fallBeats = envelopeDuration - riseBeats
  const beatDelta = ts.beats - beatsLast
  const indexesSet = new Set(indexes)
  const nextState = state.map<Point>(({ level, rising }, index) => {
    if (indexesSet.has(index)) {
      if (rising) {
        const newLevel = level + beatDelta / riseBeats
        if (newLevel > 1) {
          return {
            level: 1,
            rising: false,
          }
        } else {
          return {
            level: newLevel,
            rising: true,
          }
        }
      } else {
        const newLevel = level - beatDelta / fallBeats
        return {
          level: newLevel < 0 ? 0 : newLevel,
          rising: false,
        }
      }
    } else {
      return {
        level,
        rising,
      }
    }
  })

  if (isNewPeriod(beatsLast, ts.beats, triggerPeriod)) {
    let randCount = Math.ceil(indexes.length * triggerDensity)
    if (randCount === 0 && indexes.length > 0) randCount = 1
    pickRandomIndexes(randCount, indexes.length).forEach((randIndex) => {
      let index = indexes[randIndex]
      nextState[index].rising = true
    })
  }

  return nextState
}
