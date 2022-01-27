import styled from 'styled-components'
import { Scene, NewScene } from './Scene'
import { useControlSelector } from '../redux/store'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { useDispatch } from 'react-redux'
import { reorderScene, SceneType } from '../redux/controlSlice'

interface Props {
  sceneType: SceneType
}

export default function ScenesList({ sceneType }: Props) {
  const sceneIds = useControlSelector((control) => control[sceneType].ids)
  const dispatch = useDispatch()

  return (
    <Root>
      <DragDropContext
        onDragEnd={(res) => {
          if (!res.destination) return
          if (res.destination.index === res.source.index) return
          dispatch(
            reorderScene({
              sceneType: sceneType,
              val: {
                fromIndex: res.source.index,
                toIndex: res.destination.index,
              },
            })
          )
        }}
      >
        <Droppable droppableId="scenesList">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {sceneIds.map((id, index) => {
                return (
                  <Scene sceneType={sceneType} key={id} index={index} id={id} />
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <NewScene sceneType={sceneType} />
    </Root>
  )
}

const Root = styled.div`
  flex: 0 1 auto;
  overflow: scroll;
`
