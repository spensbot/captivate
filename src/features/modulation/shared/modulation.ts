import { initModulation, DefaultParam, Modulation } from '../../../shared/params'
import { Lfo, GetValue, GetRamp } from './oscillator'
import { LightScene_t } from '../../../shared/Scenes'
import { clampNormalized } from '../../utils/math/util'
import { defaultOutputParams } from '../../../shared/params'

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

export function getOutputParams(
  beats: number,
  scene: LightScene_t,
  splitIndex: number,
  allParamKeys: string[]
) {
  const outputParams = defaultOutputParams()
  const baseParams = scene.splitScenes[splitIndex].baseParams
  const snapshots: ModSnapshot[] = scene.modulators.map((modulator) => ({
    modulation: modulator.splitModulations[splitIndex],
    lfoVal: GetValue(modulator.lfo, beats),
  }))

  allParamKeys.forEach((param) => {
    outputParams[param] = getOutputParam(baseParams[param], param, snapshots)
  })

  return outputParams
}

function getOutputParam(
  baseParam: number | undefined,
  param: DefaultParam | string,
  snapshots: ModSnapshot[]
) {
  if (baseParam === undefined) return undefined
  return clampNormalized(
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
