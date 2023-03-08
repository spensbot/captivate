import { initModulation, DefaultParam, Modulation } from './params'
import { Lfo, oscillatorValue, GetRamp } from './oscillator'
import { AudioModulator, audioModulatorValue } from './audioModulator'
import { LightScene_t } from './Scenes'
import { clampNormalized } from '../math/util'
import { TimeState } from './TimeState'
import { defaultOutputParams } from './params'

export interface Modulator {
  mod: Lfo | AudioModulator
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
  timeState: TimeState,
  scene: LightScene_t,
  splitIndex: number,
  allParamKeys: string[]
) {
  const outputParams = defaultOutputParams()
  const baseParams = scene.splitScenes[splitIndex].baseParams
  const snapshots: ModSnapshot[] = scene.modulators.map((modulator) => ({
    modulation: modulator.splitModulations[splitIndex],
    lfoVal: modulatorValue(modulator.mod, timeState),
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
