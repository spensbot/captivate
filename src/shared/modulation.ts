import { initModulation, DefaultParam, Modulation } from './params'
import { Lfo, GetValue, GetRamp } from './oscillator'
import { LightScene_t } from './Scenes'
import { clampNormalized } from '../math/util'
import { defaultOutputParams } from './params'

export interface Modulator {
  lfo: Lfo
  splitModulations: Modulation[]
}

export function initModulator(splitCount: number): Modulator {
  return {
    lfo: GetRamp(),
    splitModulations: Array(splitCount)
      .fill(0)
      .map(() => initModulation()),
  }
}

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

function clampOutputParamValue(param: DefaultParam | string, value: number): number {
  if (param === 'moverMode') {
    // Mover mode is discrete 0..2 (Follow/Tandem/Mirror), not normalized 0..1.
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(2, value))
  }

  return clampNormalized(value)
}

export function getOutputParams(
  beats: number,
  scene: LightScene_t,
  splitIndex: number,
  allParamKeys: string[]
) {
  const baseParams = scene.splitScenes[splitIndex].baseParams
  const outputParams: Modulation = {
    ...defaultOutputParams(),
    ...baseParams,
  }

  const snapshots: ModSnapshot[] = scene.modulators.map((modulator) => ({
    modulation: modulator.splitModulations[splitIndex],
    lfoVal: GetValue(modulator.lfo, beats),
  }))

  allParamKeys.forEach((param) => {
    const outputParam = getOutputParam(baseParams[param], param, snapshots)
    if (outputParam !== undefined) {
      outputParams[param] = outputParam
    }
  })

  return outputParams
}

function getOutputParam(
  baseParam: number | undefined,
  param: DefaultParam | string,
  snapshots: ModSnapshot[]
) {
  if (baseParam === undefined) return undefined
  return clampOutputParamValue(
    param,
    snapshots.reduce((sum, { modulation, lfoVal }) => {
      const modAmount = modulation[param]
      if (modAmount === undefined) {
        return sum
      } else {
        const modAmountMapped = modAmount * 2 - 1 // from -1 to 1
        const lfoValMapped = lfoVal * 2 - 1 // from -1 to 1
        const addedModulation = (modAmountMapped * lfoValMapped) / 2 // from -0.5 to -0.5
        return sum + addedModulation
      }
    }, baseParam)
  )
}
