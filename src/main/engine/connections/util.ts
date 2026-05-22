import { DMX_MAX_VALUE, DMX_MIN_VALUE, DMX_NUM_CHANNELS } from 'shared/dmxFixtures'

// Universe should be up to 512 numbers from 0 to 255
export function getUniverseBuffer(universe: number[]): Buffer {
  const buffer = Buffer.alloc(DMX_NUM_CHANNELS, 0)
  const count = Math.min(DMX_NUM_CHANNELS, universe.length)
  for (let index = 0; index < count; index++) {
    const raw = universe[index]
    buffer[index] = Number.isFinite(raw)
      ? Math.max(DMX_MIN_VALUE, Math.min(DMX_MAX_VALUE, Math.round(raw)))
      : 0
  }
  return buffer
}

export function nullTerminatedStringPadded(
  str: string,
  totalLength?: number
): Buffer | null {
  const leftoverCount = totalLength ? totalLength - str.length : 1
  if (leftoverCount < 1) return null
  return Buffer.concat([Buffer.from(str, 'ascii'), Buffer.alloc(leftoverCount)])
}
