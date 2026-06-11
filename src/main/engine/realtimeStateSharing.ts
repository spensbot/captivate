import type { SplitState } from '../../renderer/redux/realtimeStore'
import type { Params } from '../../shared/params'
import type { RandomizerState } from '../../shared/randomizer'

export function dmxUniverseBuffersEqual(a: number[], b: number[]): boolean {
  if (a === b) {
    return true
  }
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

export function reuseUnchangedDmxOutByUniverse(
  previous: number[][],
  next: number[][]
): number[][] {
  if (previous.length !== next.length) {
    return next
  }

  const merged: number[][] = new Array(next.length)
  let reusedUniverses = 0
  for (let i = 0; i < next.length; i++) {
    const prevUniverse = previous[i]
    const nextUniverse = next[i]
    if (
      prevUniverse !== undefined &&
      nextUniverse !== undefined &&
      dmxUniverseBuffersEqual(prevUniverse, nextUniverse)
    ) {
      merged[i] = prevUniverse
      reusedUniverses++
    } else {
      merged[i] = nextUniverse
    }
  }

  if (reusedUniverses === next.length) {
    return previous
  }

  return merged
}

function outputParamsEqual(a: Params, b: Params): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}

function randomizerStateEqual(a: RandomizerState, b: RandomizerState): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    const prevPoint = a[i]
    const nextPoint = b[i]
    if (
      prevPoint.level !== nextPoint.level ||
      prevPoint.rising !== nextPoint.rising
    ) {
      return false
    }
  }
  return true
}

function splitStateEqual(a: SplitState, b: SplitState): boolean {
  return (
    outputParamsEqual(a.outputParams, b.outputParams) &&
    randomizerStateEqual(a.randomizer, b.randomizer)
  )
}

export function reuseUnchangedSplitStates(
  previous: SplitState[],
  next: SplitState[]
): SplitState[] {
  if (previous.length !== next.length) {
    return next
  }

  const merged: SplitState[] = new Array(next.length)
  let reusedSplits = 0
  for (let i = 0; i < next.length; i++) {
    const prevSplit = previous[i]
    const nextSplit = next[i]
    if (prevSplit !== undefined && splitStateEqual(prevSplit, nextSplit)) {
      merged[i] = prevSplit
      reusedSplits++
    } else {
      merged[i] = nextSplit
    }
  }

  if (reusedSplits === next.length) {
    return previous
  }

  return merged
}
