import { Modulation } from '../../params/shared/params'
import { GetValue } from '../shared/oscillator'
import { LightScene_t } from '../../scenes/shared/Scenes'

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

export const createModulationTransformer = ({
  scene,
  splitIndex,
  beats,
}: {
  scene: LightScene_t
  splitIndex: number
  beats: number
}) => {
  const snapshots: ModSnapshot[] = scene.modulators.map((modulator) => ({
    modulation: modulator.splitModulations[splitIndex],
    lfoVal: GetValue(modulator.lfo, beats),
  }))

  return {
    transform({ baseParam, param }: { baseParam: number; param: string }) {
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
