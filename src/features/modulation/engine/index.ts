import { Modulation } from '../../params/shared/params'
import { GetValue } from '../shared/oscillator'
import { Modulator } from '../shared/modulation'

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

export const createModulationTransformer = ({
  modulators,
  trackIndex,
  beats,
}: {
  modulators: Modulator[]
  trackIndex: number
  beats: number
}) => {
  const snapshots: ModSnapshot[] = modulators.map((modulator) => ({
    modulation: modulator.splitModulations[trackIndex],
    lfoVal: GetValue(modulator.lfo, beats),
  }))

  return {
    apply({ baseParam, param }: { baseParam: number; param: string }) {
      return snapshots.reduce((sum, { modulation, lfoVal }) => {
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
    },
  }
}
