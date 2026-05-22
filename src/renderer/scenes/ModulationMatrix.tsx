import {
  useActiveLightScene,
  useControlSelector,
  useDmxSelector,
} from 'renderer/redux/store'
import styled from 'styled-components'
import ModulationSlider, { AddModulationButton } from './ModulationSlider'
import { getAllParamKeys } from 'renderer/redux/dmxSlice'
import { activeInterModParamKeys } from '../../shared/modulation'
import { useModPreviewSplit } from './useModPreviewSplit'

export default function ModulationMatrix({ index }: { index: number }) {
  const activeSceneId = useControlSelector((control) => control.light.active)
  const splitIndex = useModPreviewSplit()
  return (
    <div>
      <SplitSceneModulationMatrix
        key={splitIndex + activeSceneId}
        modIndex={index}
        splitIndex={splitIndex}
      />
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
  const interModKeys = useActiveLightScene((scene) =>
    activeInterModParamKeys(scene.modulators[modIndex]?.lfoInterModulation)
  )

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
      {interModKeys.map((paramKey) => (
        <ModulationSlider
          splitIndex={splitIndex}
          key={`${paramKey}:im:${splitIndex}:mod${modIndex}`}
          modIndex={modIndex}
          param={paramKey}
        />
      ))}
    </SplitRoot>
  )
}

const SplitRoot = styled.div``
