import { Normalized } from '../features/utils/math/util'

export type Window = {
  pos: Normalized
  width: Normalized
}

export type Window2D_t = {
  x?: Window
  y?: Window
}
