type Koffi = typeof import('koffi')

let cached: Koffi | null | undefined

/** Returns null when the native addon is missing (e.g. bad macOS bundle). */
export function tryGetKoffi(): Koffi | null {
  if (cached !== undefined) {
    return cached
  }
  try {
    // Lazy require so a missing native binary does not crash main-process boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('koffi') as Koffi
  } catch (err) {
    console.error(
      '[captivate] Failed to load native koffi module:',
      err instanceof Error ? err.message : err
    )
    cached = null
  }
  return cached
}

export function getKoffi(): Koffi {
  const koffi = tryGetKoffi()
  if (koffi === null) {
    throw new Error(
      'Cannot load native Koffi module; did you bundle it correctly? Reinstall Captivate or rebuild release natives.'
    )
  }
  return koffi
}
