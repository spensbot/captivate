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

export function randomElement<Type>(items: Type[]) {
  const randIndex = Math.floor( (Math.random() * items.length) )
  return items[randIndex]
}

export function getFilename(path: string) {
  return path.substring(path.lastIndexOf("/") + 1);
}

export function lerp(start: number, stop: number, amt: number) {
  const delta = stop - start
  return start + delta * amt
}