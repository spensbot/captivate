import { useTypedSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import {
  activeVisualSceneEffect_removeIndex,
  activeVisualScene_setActiveEffectIndex,
} from 'renderer/redux/controlSlice'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import { Draggable } from 'react-beautiful-dnd'
import { effectDisplayNames } from 'features/visualizer/threejs/effects/effectConfigs'

interface Props {
  index: number
}

export default function Effect({ index }: Props) {
  const effect = useTypedSelector((state) => {
    const visual = state.control.present.visual
    const activeVisualScene = visual.byId[visual.active]
    return activeVisualScene.effectsConfig[index]
  })
  const activeVisualSceneId = useTypedSelector(
    (state) => state.control.present.visual.active
  )
  const isActive = useTypedSelector((state) => {
    const visual = state.control.present.visual
    const activeVisualScene = visual.byId[visual.active]
    return activeVisualScene.activeEffectIndex === index
  })
  const dispatch = useDispatch()
  const displayName = effectDisplayNames[effect.type]

  return (
    <Draggable draggableId={activeVisualSceneId + index} index={index}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <Root
            onClick={() =>
              dispatch(activeVisualScene_setActiveEffectIndex(index))
            }
            isActive={isActive}
          >
            <Text>{displayName}</Text>
            <div style={{ flex: '1 0 0' }} />
            <div {...provided.dragHandleProps}>
              <DragHandleIcon />
            </div>
            <IconButton
              aria-label="delete scene"
              size="small"
              onClick={() =>
                dispatch(activeVisualSceneEffect_removeIndex(index))
              }
            >
              <CloseIcon />
            </IconButton>
          </Root>
        </div>
      )}
    </Draggable>
    // <Root
    //
    // >
    //   <Text>{effect.type}</Text>

    //   <IconButton>
    //     <CloseIcon />
    //   </IconButton>
    // </Root>
  )
}

const Root = styled.div<{ isActive: boolean }>`
  padding: 0 0 0 0.5rem;
  border-right: 1px solid
    ${(props) =>
      props.isActive
        ? props.theme.colors.bg.primary
        : props.theme.colors.divider};
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  cursor: pointer;
  display: flex;
  align-items: center;
  background-color: ${(props) =>
    props.isActive && props.theme.colors.bg.primary};
`

const Text = styled.div`
  margin: 0 1rem 0 0;
  overflow: hidden;
  flex: 0 1 auto;
`

// const SidewaysText = styled.p`
//   text-orientation: upright;
//   writing-mode: vertical-rl;
//   margin: 0;
//   transform: rotate(-90deg);
// `
