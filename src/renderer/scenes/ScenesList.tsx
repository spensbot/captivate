import styled from 'styled-components'
import { Scene, NewScene } from './Scene'
import { useScenesSelector } from '../redux/store'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { useDispatch } from 'react-redux'
import { reorderScene } from '../redux/scenesSlice'

interface Props {}

export default function ScenesList({}: Props) {
  const sceneIds = useScenesSelector((state) => state.ids)
  const dispatch = useDispatch()

  return (
    <Root>
      <DragDropContext
        onDragEnd={(res) => {
          if (!res.destination) return
          if (res.destination.index === res.source.index) return
          dispatch(
            reorderScene({
              fromIndex: res.source.index,
              toIndex: res.destination.index,
            })
          )
        }}
      >
        <Droppable droppableId="scenesList">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {sceneIds.map((id, index) => {
                return <Scene key={id} index={index} id={id} />
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <NewScene />
    </Root>
  )
}

const Root = styled.div`
  flex: 0 1 auto;
  overflow: scroll;
`
