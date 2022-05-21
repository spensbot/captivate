import styled from 'styled-components'
import { FileFilter } from 'electron'
import { useEffect } from 'react'
import { getLocalFilepaths } from 'renderer/ipcHandler'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import Input from 'renderer/base/Input'

const videoFileFilters: FileFilter[] = [
  { name: 'mp4', extensions: ['mp4'] },
  { name: 'mov', extensions: ['mov'] },
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
    onChange([...filepaths, ...addedFilepaths])
  }

  useEffect(() => {
    ;() => {
      onAddSuccess = () => {}
    }
  }, [])

  return (
    <Root>
      {filepaths.map((filepath, i) => (
        <Input
          key={filepath + i}
          value={filepath}
          onChange={(newFilepath) => {
            let newFilepaths = [...filepaths]
            newFilepaths[i] = newFilepath
            onChange(newFilepaths)
          }}
        />
      ))}
      <IconButton onClick={onAdd}>
        <AddIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div``
