// Universe should be up to 512 numbers from 0 to 255
export function getUniverseBuffer(universe: number[]) {
  const buffer = Buffer.alloc(512, 0)
  universe.forEach((value, index) => (buffer[index] = value))
  return buffer
}
