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
