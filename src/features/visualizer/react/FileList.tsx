import styled from 'styled-components'
import { useEffect } from 'react'
import * as api from 'renderer/api'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import path from 'path-browserify'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import DragHandle from '@mui/icons-material/DragHandle'
import { reorderArray } from 'features/utils/util'
import { FileFilter } from 'electron/renderer'
import {
  videoExtensions,
  imageExtensions,
} from 'features/visualizer/threejs/layers/LocalMediaConfig'

const localMediaFileFilters: FileFilter[] = [
  { name: 'Media', extensions: [...videoExtensions, ...imageExtensions] },
]

interface Props {
  filepaths: string[]
  onChange: (newFilepaths: string[]) => void
}

export default function FileList(props: Props) {
  let onAdd = () => {
    api.queries.getLocalFilepaths('Select Media', localMediaFileFilters)
      .then(onAddSuccess)
      .catch((_err) => {})
  }

  let onAddSuccess = (addedFilepaths: string[]) => {
    props.onChange([...props.filepaths, ...addedFilepaths])
  }

  useEffect(() => {
    ;() => {
      onAddSuccess = () => {}
    }
  }, [])

  return (
    <Root>
      <DragDropContext
        onDragEnd={({ source, destination }) => {
          let fpCopy = [...props.filepaths]
          reorderArray(fpCopy, {
            fromIndex: source.index,
            toIndex: destination?.index ?? 0,
          })
          props.onChange(fpCopy)
        }}
      >
        <Droppable droppableId="list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {files(props)}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <IconButton onClick={onAdd}>
        <AddIcon />
      </IconButton>
    </Root>
  )
}

function files({ filepaths, onChange }: Props) {
  return filepaths.map((filepath, i) => {
    return (
      <File
        filepaths={filepaths}
        key={filepath + i}
        i={i}
        filepath={filepath}
        onChange={onChange}
      />
    )
  })
}

interface FileProps extends Props {
  filepath: string
  i: number
}

function File({ filepaths, i, filepath, onChange }: FileProps) {
  let name = path.basename(filepath)
  let dir = path.dirname(filepath)
  return (
    <Draggable draggableId={filepath + i} index={i}>
      {(provided) => (
        <Entry ref={provided.innerRef} {...provided.draggableProps}>
          <div {...provided.dragHandleProps}>
            <DragHandle />
          </div>
          <Name
            onClick={() => {
              let fpCopy = [...filepaths]
              fpCopy.splice(i, 1)
              onChange(fpCopy)
            }}
          >
            {name}
          </Name>
          <Dir>{dir}</Dir>
        </Entry>
      )}
    </Draggable>
  )
}

const Root = styled.div``

const Entry = styled.div`
  display: flex;
  align-items: center;
`
const Name = styled.div`
  margin-right: 0.5rem;
  white-space: nowrap;
  :hover {
    text-decoration: line-through;
  }
`
const Dir = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;
  overflow: scroll;
`
