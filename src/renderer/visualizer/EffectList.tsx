import styled from 'styled-components'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import Effect from './Effect'
import { useDispatch } from 'react-redux'
import {
  activeVisualSceneEffect_reorder,
  activeVisualSceneEffect_add,
} from 'renderer/redux/controlSlice'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { indexArray } from '../../shared/util'
import { useActiveVisualScene, useTypedSelector } from 'renderer/redux/store'

interface Props {}

export default function EffectList({}: Props) {
  const dispatch = useDispatch()
  const activeVisualSceneId = useTypedSelector(
    (state) => state.control.present.visual.active
  )
  const effectsCount = useActiveVisualScene(
    (scene) => scene.effectsConfig.length
  )

  return (
    <Root>
      <DragDropContext
        onDragEnd={(res) => {
          if (!res.destination) return
          if (res.destination.index === res.source.index) return
          dispatch(
            activeVisualSceneEffect_reorder({
              fromIndex: res.source.index,
              toIndex: res.destination.index,
            })
          )
        }}
      >
        <Droppable droppableId="effectsList">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {indexArray(effectsCount).map((index) => {
                return (
                  <Effect key={activeVisualSceneId + index} index={index} />
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Rest>
        <IconButton
          onClick={() =>
            dispatch(
              activeVisualSceneEffect_add({
                type: 'Glitch',
              })
            )
          }
        >
          <AddIcon />
        </IconButton>
      </Rest>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background-color: #151515;
  width: 10rem;
`

const Rest = styled.div`
  flex: 1 0 0;
  width: 100%;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
`
