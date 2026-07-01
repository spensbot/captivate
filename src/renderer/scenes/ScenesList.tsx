import styled from 'styled-components'
import { Scene, NewScene } from './Scene'
import { useControlSelector } from '../redux/store'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { useDispatch } from 'react-redux'
import { reorderScene } from '../redux/controlSlice'
import { SceneType } from '../../shared/Scenes'

interface Props {
  sceneType: SceneType
  flattenScroll?: boolean
}

export default function ScenesList({
  sceneType,
  flattenScroll = false,
}: Props) {
  const sceneIds = useControlSelector((control) => control[sceneType].ids)
  const dispatch = useDispatch()

  return (
    <Root $flatten={flattenScroll}>
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

const Root = styled.div<{ $flatten?: boolean }>`
  flex: ${(p) => (p.$flatten ? '0 0 auto' : '1 1 auto')};
  min-height: ${(p) => (p.$flatten ? 'auto' : 0)};
  overflow-y: ${(p) => (p.$flatten ? 'visible' : 'auto')};
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a33 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`
