import { useState } from 'react'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { store } from '../redux/store'
import { saveFile, loadFile, captivateFileFilters } from '../saveload_renderer'
import { DeviceState } from '../redux/deviceState'
import { DmxState } from '../redux/dmxSlice'
import { LightScenes_t, VisualScenes_t } from 'shared/Scenes'
import Popup from 'renderer/base/Popup'
import { Button } from '@mui/material'

type SaveState = {
  light?: LightScenes_t
  visual?: VisualScenes_t
  dmx?: DmxState
  device?: DeviceState
}
type SaveType = keyof SaveState
type SaveConfig = { [key in SaveType]: boolean }
const saveTypes: SaveType[] = ['light', 'dmx', 'visual', 'device']

function fixState(_state: SaveState) {}

async function load() {
  const serializedSaveState = await loadFile('Load Scenes', [
    captivateFileFilters.captivate,
  ])
  const saveState = fixState(JSON.parse(serializedSaveState))
  return saveState
}

function save(config: SaveConfig) {
  const state = store.getState()
  const control = state.control.present
  const dmx = state.dmx.present

  const saveState: SaveState = {
    light: config.light ? control.light : undefined,
    visual: config.visual ? control.visual : undefined,
    dmx: config.dmx ? dmx : undefined,
    device: config.device ? control.device : undefined,
  }

  const serializedSaveState = JSON.stringify(saveState)
  saveFile('Save Scenes', serializedSaveState, [captivateFileFilters.captivate])
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

export default function SaveLoad({}: Props) {
  return (
    <>
      <Save />
      <Load />
    </>
  )
}

function Save() {
  const [isOpen, setIsOpen] = useState(false)
  const [saveConfig, setSaveConfig] = useState<SaveConfig>({
    light: true,
    visual: true,
    dmx: true,
    device: true,
  })
  return (
    <Root>
      <IconButton onClick={() => setIsOpen(true)}>
        <SaveIcon />
      </IconButton>
      {isOpen && (
        <Popup title="Save" onClose={() => setIsOpen(false)}>
          {saveTypes.map((saveType) => saveType)}
          <Button onClick={() => save(saveConfig)}>Save</Button>
        </Popup>
      )}
    </Root>
  )
}

function Load() {
  return (
    <Root>
      <IconButton onClick={load}>
        <LoadIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: relative;
`
