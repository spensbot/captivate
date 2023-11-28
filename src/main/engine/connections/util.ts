// Universe should be up to 512 numbers from 0 to 255
export function getUniverseBuffer(universe: number[]): Buffer {
  const buffer = Buffer.alloc(512, 0)
  universe.forEach((value, index) => (buffer[index] = value))
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
