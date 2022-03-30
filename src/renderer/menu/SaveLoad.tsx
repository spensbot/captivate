import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { CleanReduxState } from '../redux/store'
import { saveFile, loadFile, captivateFileFilters } from '../saveload_renderer'

function fixState(_state: CleanReduxState) {}

function load() {
  loadFile('Load Scenes', [captivateFileFilters.scenes])
    .then((serializedControlState) => {
      const newControlState: SaveType = fixState(
        JSON.parse(serializedControlState)
      )

      store.dispatch(
        resetControl({
          device: store.getState().control.present.device,
          master: 1,
          light: newControlState.light,
          visual: newControlState.visual,
        })
      )
    })
    .catch((err) => {
      console.error(err)
    })
}

function save() {
  const controlState: SaveType = store.getState().control.present
  const serializedControlState = JSON.stringify(controlState)
  saveFile('Save Scenes', serializedControlState, [captivateFileFilters.scenes])
    .then((err) => {
      if (err) {
        console.error(err)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

interface Props {}

export default function Save({}: Props) {
  return (
    <>
      <IconButton onClick={saveScenes}>
        <SaveIcon />
      </IconButton>
      <IconButton onClick={loadScenes}>
        <LoadIcon />
      </IconButton>
    </>
  )
}

const Root = styled.div``
