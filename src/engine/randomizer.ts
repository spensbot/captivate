import { clampNormalized } from '../util/helpers'
import { isNewPeriod, Beats } from './beatTime'
import { TimeState } from '../redux/realtimeStore'

type Normalized = number
type Millis = number

export interface Point {
  level: Normalized
  rising: boolean
}

export type RandomizerState = Point[]

export function initRandomizerOptions(): RandomizerOptions {
  return {
    firePeriod: 1,
    triggersPerFire: 1,
    riseTime: 20,
    fallTime: 300
  }
}

export interface RandomizerOptions {
  firePeriod: Beats
  triggersPerFire: number
  riseTime: Millis
  fallTime: Millis
}

function initPoint(): Point {
  return {
    level: 0,
    rising: false
  }
}

export function initRandomizerState(): RandomizerState {
  return []
}

export function syncAndUpdate(state: RandomizerState, array: any[], ts: TimeState, options: RandomizerOptions) {
  return update(sync(state, array), ts, options)
}

function sync(state: RandomizerState, array: any[]) {
  let syncedState = state
  if (state.length !== array.length) {
    if (state.length > array.length) {
      syncedState = state.slice(0, array.length)
    } else {
      syncedState = [...state]
      while (syncedState.length < array.length) {
        syncedState.push(initPoint())
      }
    }
  }
  return syncedState
}

function pickRandomIndexes(randCount: number, array: any[]) {
  const randoms: number[] = []
  for (let i = 0; i < randCount; i++) {
    const randomIndex = Math.floor(Math.random() * array.length)
    randoms.push(randomIndex)
  }
  return randoms
}

function update(state: RandomizerState, ts: TimeState, {firePeriod, triggersPerFire, riseTime, fallTime}: RandomizerOptions) {
  const nextState = state.map<Point>(({ level, rising }) => {
    if (rising) {
      const newLevel = level + ts.dt / riseTime
      if (newLevel > 1) {
        return {
          level: 1,
          rising: false
        }
      } else {
        return {
          level: newLevel,
          rising: true
        }
      }
    } else {
      const newLevel = level - ts.dt / fallTime
      return {
        level: newLevel < 0 ? 0 : newLevel,
        rising: false
      }
    }
  })

  if (isNewPeriod(ts, firePeriod))
    pickRandomIndexes(triggersPerFire, state).forEach(i => nextState[i].rising = true)

  return nextState
}