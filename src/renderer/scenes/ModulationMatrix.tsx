import {
  useActiveLightScene,
  useControlSelector,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import { hideVisSplitUi } from './splitUiVisibility'
import styled from 'styled-components'
import { indexArray } from 'shared/util'
import ModulationSlider, { AddModulationButton } from './ModulationSlider'
import { getAllParamKeys } from 'renderer/redux/dmxSlice'
import { activeInterModParamKeys } from '../../shared/modulation'

export default function ModulationMatrix({ index }: { index: number }) {
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)
  const activeSceneId = useControlSelector((control) => control.light.active)
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const splitGroupsByIndex = useActiveLightScene((scene) =>
    scene.splitScenes.map((s) => s.groups)
  )
  return (
    <div>
      {indexArray(numSplits).map((splitIndex) => {
        if (
          hideVisSplitUi(
            videoEnabled,
            splitGroupsByIndex[splitIndex]
          )
        ) {
          return null
        }
        return (
          <SplitSceneModulationMatrix
            key={splitIndex + activeSceneId}
            modIndex={index}
            splitIndex={splitIndex}
          />
        )
      })}
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
    activeInterModParamKeys(
      scene.modulators[modIndex]?.splitModulations[splitIndex]
    )
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
