import styled from 'styled-components'
import { FileFilter } from 'electron'
import { useEffect } from 'react'
import { getLocalFilepaths } from 'renderer/ipcHandler'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import path from 'path'

const videoFileFilters: FileFilter[] = [
  { name: 'mp4', extensions: ['mp4'] },
  { name: 'mov', extensions: ['mov', 'MOV'] },
  { name: 'webm', extensions: ['webm'] },
  { name: 'ogg', extensions: ['ogg'] },
]

const imageFileFilters: FileFilter[] = [
  { name: 'jpeg', extensions: ['jpg', 'jpeg'] },
  { name: 'png', extensions: ['png'] },
  { name: 'gif', extensions: ['gif'] },
  { name: 'svg', extensions: ['svg'] },
]

const localMedialFileFilters: FileFilter[] = [
  ...videoFileFilters,
  ...imageFileFilters,
]

interface Props {
  filepaths: string[]
  onChange: (newFilepaths: string[]) => void
}

export default function FileList({ filepaths, onChange }: Props) {
  let onAdd = () => {
    getLocalFilepaths('Select Media', localMedialFileFilters)
      .then(onAddSuccess)
      .catch((_err) => {})
  }

  let onAddSuccess = (addedFilepaths: string[]) => {
    console.log(addedFilepaths)
    onChange([...filepaths, ...addedFilepaths])
  }

  useEffect(() => {
    ;() => {
      onAddSuccess = () => {}
    }
  }, [])

  return (
    <Root>
      {filepaths.map((filepath, i) => {
        let name = path.basename(filepath)
        let dir = path.dirname(filepath)
        return (
          <Entry>
            <DeleteButton
              onClick={() => {
                let fpCopy = [...filepaths]
                fpCopy.splice(i, 1)
                onChange(fpCopy)
              }}
            >
              <Delete />
            </DeleteButton>
            <Name>{name}</Name>
            <Dir>{dir}</Dir>
          </Entry>
        )
      })}
      <IconButton onClick={onAdd}>
        <AddIcon />
      </IconButton>
    </Root>
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
`
const Dir = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;
  overflow: scroll;
`
const DeleteButton = styled.div`
  height: 1.2rem;
  margin-right: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
`
const Delete = styled.div`
  height: 0.2rem;
  width: 1rem;
  background-color: ${(props) => props.theme.colors.text.primary};
`
