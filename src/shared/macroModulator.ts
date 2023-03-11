import { Normalized } from '../math/util'
import { TimeState } from './TimeState'
import { skewPower3 } from '../math/skew'
import { Adsr, adsr_level, adsr_ratio } from './adsr'

export type MacroModulator = SliderMacro | TriggerMacro
export type MacroModulatorType = MacroModulator['type']

export interface SliderMacro {
  type: 'Slider'
  skew: Normalized
  value: Normalized
}

export interface TriggerMacro {
  type: 'Trigger'
  duration_ms: number // ms
  adsr: Adsr
  last_pressed: number // ms since epoch
  last_released: number // ms since epoch
}

export function macroModulatorValueIn(
  modulator: MacroModulator,
  timeState: TimeState
): Normalized {
  switch (modulator.type) {
    case 'Slider':
      return modulator.value
    case 'Trigger':
      const now = timeState.instant
      const ms_since_pressed = now - modulator.last_pressed
      const ms_since_released = now - modulator.last_released
      const ratio_since_pressed = ms_since_pressed / modulator.duration_ms
      const ratio_since_released = ms_since_released / modulator.duration_ms

      return adsr_ratio(
        ratio_since_pressed,
        ratio_since_released,
        modulator.adsr
      )
  }
}

export function macroModulatorValue(
  modulator: MacroModulator,
  timeState: TimeState
): Normalized {
  switch (modulator.type) {
    case 'Slider':
      return skewPower3(modulator.value, modulator.skew)
    case 'Trigger':
      const now = timeState.instant
      const ms_since_pressed = now - modulator.last_pressed
      const ms_since_released = now - modulator.last_released
      const ratio_since_pressed = ms_since_pressed / modulator.duration_ms
      const ratio_since_released = ms_since_released / modulator.duration_ms
      return adsr_level(
        ratio_since_pressed,
        ratio_since_released,
        modulator.adsr
      )
  }
}
