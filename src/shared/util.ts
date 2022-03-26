export function clampNormalized(val: number) {
  if (val < 0.0) return 0.0
  if (val > 1.0) return 1.0
  return val
}

export function clamp(val: number, min: number, max: number) {
  if (val < min) return min
  if (val > max) return max
  return val
}

export function clampMaybe(val: number, min?: number, max?: number) {
  if (min !== undefined) {
    if (val < min) return min
  }
  if (max !== undefined) {
    if (val > max) return max
  }
  return val
}

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

export function lerp(start: number, stop: number, amt: number) {
  const delta = stop - start
  return start + delta * amt
}

export function indexArray(length: number) {
  return Array.from(Array(length).keys())
}

export function testSpeed(f: () => void, count: number, name: string) {
  const array = Array(count).fill(0)
  const startTime = Date.now()
  array.forEach(f)
  const endTime = Date.now()
  const duration = endTime - startTime
  console.info(`${name}: ${duration / count}ms per call`)
}

// random number between 0 and max
export function random(max: number) {
  return Math.random() * max
}

export function randomRanged(min: number, max: number) {
  let range = max - min
  return min + Math.random() * range
}

export function randomBool() {
  return Math.random() > 0.5
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
