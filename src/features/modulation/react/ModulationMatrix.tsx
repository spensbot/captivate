import {
  useActiveLightScene,
  useControlSelector,
  useDmxSelector,
} from 'renderer/redux/store'
import styled from 'styled-components'
import { indexArray } from 'features/utils/util'
import ModulationSlider, { AddModulationButton } from './ModulationSlider'
import { getAllParamKeys } from 'features/params/shared/params'

export default function ModulationMatrix({ index }: { index: number }) {
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)
  const activeSceneId = useControlSelector((control) => control.light.active)
  return (
    <div>
      {indexArray(numSplits).map((splitIndex) => (
        <SplitSceneModulationMatrix
          key={splitIndex + activeSceneId}
          modIndex={index}
          splitIndex={splitIndex}
        />
      ))}
      <AddModulationButton modIndex={index} />
    </div>
  )
}

function SplitSceneModulationMatrix({
  modIndex,
  splitIndex,
}: {
  modIndex: number
  splitIndex: number
}) {
  const allParamKeys = useDmxSelector((dmx) => getAllParamKeys(dmx))

  return (
    <SplitRoot>
      {allParamKeys.map((paramKey) => {
        return (
          <ModulationSlider
            splitIndex={splitIndex}
            key={paramKey + 'mod' + splitIndex + modIndex.toString()}
            modIndex={modIndex}
            param={paramKey}
          />
        )
      })}
    </SplitRoot>
  )
}

const SplitRoot = styled.div``
