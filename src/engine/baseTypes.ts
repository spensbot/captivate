export type Normalized = number // 0.0 - 1.0

export type Position = {
  x: Normalized
  y: Normalized
}

export type Size = {
  width: Normalized
  height: Normalized
}

export type Range = {
  min: Normalized,
  max: Normalized
}

export type Window = {
  pos: Normalized
  width: Normalized
}

export type Window2D = {
  x?: Window
  y?: Window
}

