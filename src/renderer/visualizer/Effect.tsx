import { useTypedSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Select from '../base/Select'
import { effectTypes } from 'renderer/visualizer/threejs/EffectTypes'
import { useDispatch } from 'react-redux'
import {
  activeVisualSceneEffect_set,
  activeVisualScene_setActiveEffectIndex,
} from 'renderer/redux/controlSlice'

interface Props {
  index: number
}

export default function Effect({ index }: Props) {
  const effect = useTypedSelector((state) => {
    const visual = state.control.present.visual
    const activeVisualScene = visual.byId[visual.active]
    return activeVisualScene.effectsConfig[index]
  })
  const isActive = useTypedSelector((state) => {
    const visual = state.control.present.visual
    const activeVisualScene = visual.byId[visual.active]
    return activeVisualScene.activeEffectIndex === index
  })
  const dispatch = useDispatch()

  if (isActive) {
    return (
      <RootOpen>
        <Select
          label="Effect"
          val={effect.type}
          items={effectTypes}
          onChange={(newType) =>
            dispatch(
              activeVisualSceneEffect_set({
                type: newType,
              })
            )
          }
        />
      </RootOpen>
    )
  } else {
    return (
      <Root
        onClick={() => dispatch(activeVisualScene_setActiveEffectIndex(index))}
      >
        <SidewaysText>{effect.type}</SidewaysText>
      </Root>
    )
  }
}

const Root = styled.div`
  padding: 0.2rem;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  cursor: pointer;
`

const SidewaysText = styled.p`
  /* text-orientation: upright; */
  writing-mode: vertical-rl;
  margin: 0;
  /* transform: rotate(-90deg); */
`

const RootOpen = styled.div`
  padding: 0.2rem;
  flex: 1 0 0;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
`
