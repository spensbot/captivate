export type SeededRng = {
  next: () => number
  int: (maxExclusive: number) => number
  float: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
  bool: (probability?: number) => boolean
}

function hashSeed(input: number | string): number {
  const str = String(input)
  let hash = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createSeededRng(seed: number | string = Date.now()): SeededRng {
  let state = hashSeed(seed) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  return {
    next,
    int(maxExclusive: number) {
      if (maxExclusive <= 0) return 0
      return Math.floor(next() * maxExclusive)
    },
    float(min: number, max: number) {
      return min + (max - min) * next()
    },
    pick<T>(items: readonly T[]): T {
      return items[this.int(items.length)]!
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = this.int(i + 1)
        const tmp = copy[i]!
        copy[i] = copy[j]!
        copy[j] = tmp
      }
      return copy
    },
    bool(probability = 0.5) {
      return next() < probability
    },
  }
}
