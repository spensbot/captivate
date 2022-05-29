import { random } from '../math/util'
import { Range } from '../math/range'

export function randomElement<Type>(items: Type[]) {
  return items[randomIndex(items.length)]
}

// Only intended to be used with primitives.
// Could technically be used with objects, but it will only compare the reference
export function randomElementExcludeCurrent<T>(items: T[], current: T) {
  if (items.length < 1) return current
  const currentIndex = items.findIndex((item) => item === current)
  if (currentIndex > -1) {
    return items[randomIndexExcludeCurrent(items.length, currentIndex)]
  } else {
    return items[randomIndex(items.length)]
  }
}

export function randomIndex(length: number) {
  return Math.floor(random(length))
}

export function randomIndexExcludeCurrent(
  length: number,
  currentIndex: number
) {
  const rand = randomIndex(length)
  if (rand === currentIndex) {
    if (rand < length - 1) {
      return rand + 1
    } else {
      return 0
    }
  } else {
    return rand
  }
}

export function getFilename(path: string) {
  return path.substring(path.lastIndexOf('/') + 1)
}

export function indexArray(len: number) {
  return Array.from(Array(Math.floor(len)).keys())
}

export function zeroArray(len: number) {
  return Array(Math.floor(len)).fill(0)
}

export function testSpeed(f: () => void, count: number, name: string) {
  const array = Array(count).fill(0)
  const startTime = Date.now()
  array.forEach(f)
  const endTime = Date.now()
  const duration = endTime - startTime
  console.info(`${name}: ${duration / count}ms per call`)
}

export interface ReorderParams {
  fromIndex: number
  toIndex: number
}

export function reorderArray<T>(
  array: T[],
  { fromIndex, toIndex }: ReorderParams
) {
  let element = array.splice(fromIndex, 1)[0]
  array.splice(toIndex, 0, element)
}

export function double_incremented(val: number) {
  let ref = 1
  const doubled = val * 2
  if (doubled > ref) {
    while (doubled > ref) {
      ref *= 2
    }
    return ref
  } else {
    while (doubled < ref) {
      ref /= 2
    }
    return ref
  }
}

export function halve_incremented(val: number) {
  let ref = 1
  const halved = val / 2
  if (halved > ref) {
    while (halved > ref) {
      ref *= 2
    }
    return ref
  } else {
    while (halved < ref) {
      ref /= 2
    }
    return ref
  }
}

export function mapFn(
  skew: number,
  range_out?: Partial<Range>
): (normalized: number) => number {
  let min = range_out?.min ?? 0
  let max = range_out?.max ?? 1
  let range = max - min

  return (normalized: number) => normalized ** skew * range + min
}

export function mapRangeFn(
  skew: number,
  range_out?: Partial<Range>
): (normalizedRange: Range) => Range {
  let mapVal = mapFn(skew, range_out)

  return (normalizedRange: Range) => ({
    min: mapVal(normalizedRange.min),
    max: mapVal(normalizedRange.max),
  })
}
