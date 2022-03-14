import { useActiveLightScene } from 'renderer/redux/store'
import styled from 'styled-components'
import { indexArray } from 'shared/util'
import { paramsList } from '../../shared/params'
import ModulationSlider, { AddModulationButton } from './ModulationSlider'

export default function ModulationMatrix({ index }: { index: number }) {
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)
  return (
    <div>
      <SplitSceneModulationMatrix modIndex={index} splitIndex={null} />
      {indexArray(numSplits).map((splitIndex) => (
        <SplitSceneModulationMatrix modIndex={index} splitIndex={splitIndex} />
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
  splitIndex: number | null
}) {
  return (
    <SplitRoot>
      {paramsList.map((paramKey) => {
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
