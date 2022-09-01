import { initModulation, paramsList, Param, Modulation } from './params'
import { Lfo, oscillatorValue, GetRamp } from './oscillator'
import { AudioModulator, audioModulatorValue } from './audioModulator'
import { LightScene_t } from './Scenes'
import { clampNormalized } from '../math/util'
import { mapUndefinedParamsToDefault, defaultOutputParams } from './params'
import { TimeState } from './TimeState'

export interface Modulator {
  mod: Lfo | AudioModulator
  modulation: Modulation
  splitModulations: Modulation[]
}

export type ModulatorType = Modulator['mod']['type']

export const modulatorTypes: ModulatorType[] = [
  'Freq',
  'Pitch',
  'RMS',
  'Sin',
  'Ramp',
]

function modulatorValue(modulator: Lfo | AudioModulator, timeState: TimeState) {
  if (modulator.type === 'Sin' || modulator.type === 'Ramp') {
    return oscillatorValue(modulator, timeState.beats)
  } else if (
    modulator.type === 'Freq' ||
    modulator.type === 'Pitch' ||
    modulator.type === 'RMS'
  ) {
    return audioModulatorValue(modulator, timeState)
  } else {
    console.error('modulatorValue unhandled type')
    return 0
  }
}

export function initModulator(splitCount: number): Modulator {
  return {
    mod: GetRamp(),
    modulation: initModulation(),
    splitModulations: Array(splitCount)
      .fill(0)
      .map(() => ({})),
  }
}

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

export function getOutputParams(
  timeState: TimeState,
  scene: LightScene_t,
  splitIndex: number | null
) {
  const outputParams = defaultOutputParams()
  const baseParams =
    splitIndex === null
      ? scene.baseParams
      : scene.splitScenes[splitIndex].baseParams
  // const baseParams = defaultOutputParams()
  const mappedParams = mapUndefinedParamsToDefault(baseParams)
  const snapshots: ModSnapshot[] =
    splitIndex === null
      ? scene.modulators.map((modulator) => ({
          modulation: modulator.modulation,
          lfoVal: modulatorValue(modulator.mod, timeState),
        }))
      : scene.modulators.map((modulator) => ({
          modulation: modulator.splitModulations[splitIndex],
          lfoVal: modulatorValue(modulator.mod, timeState),
        }))

  paramsList.forEach((param) => {
    outputParams[param] = getOutputParam(mappedParams[param], param, snapshots)
  })

  return outputParams
}

function getOutputParam(
  baseParam: number,
  param: Param,
  snapshots: ModSnapshot[]
) {
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
