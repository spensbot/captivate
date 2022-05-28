import { Normalized } from '../math/util'

export type Window = {
  pos: Normalized
  width: Normalized
}

export type Window2D_t = {
  x?: Window
  y?: Window
}
