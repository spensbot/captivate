import * as baseTypes from './baseTypes'

enum LfoShape {
  Sin,
  Square,
  Saw,
  Constant
}

type Oscillator = {
  shape: LfoShape
  period: number //seconds
  value: baseTypes.Normalized
}

type Pattern = {
  oscillators: Oscillator[],
  epicnessRange?: Range,
}