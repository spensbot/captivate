import { useState, useEffect } from 'react'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { store, resetState } from '../redux/store'
import { saveFile, loadFile, captivateFileFilters } from '../saveload_renderer'
import { DeviceState } from '../redux/deviceState'
import { DmxState } from '../redux/dmxSlice'
import { LightScenes_t, VisualScenes_t } from 'shared/Scenes'
import Popup from 'renderer/base/Popup'
import { Button, Checkbox } from '@mui/material'

async function load() {
  const serializedSaveState = await loadFile('Load Scenes', [
    captivateFileFilters.captivate,
  ])
  const saveState: SaveState = JSON.parse(serializedSaveState)
  fixState(saveState)
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
        <Popup title="Save Configuration" onClose={() => setIsOpen(false)}>
          {saveTypes.map((saveType) => {
            return (
              <CheckItem>
                <Checkbox
                  checked={saveConfig[saveType]}
                  onChange={(e) =>
                    setSaveConfig({
                      ...saveConfig,
                      [saveType]: e.target.checked,
                    })
                  }
                  size="small"
                />
                {display(saveType)}
              </CheckItem>
            )
          })}
          <Sp />
          <Button onClick={() => save(saveConfig)}>Save</Button>
        </Popup>
      )}
    </Root>
  )
}

function Load() {
  const [state, setState] = useState<{
    save: SaveState
    config: SaveConfig
  } | null>(null)

  let onLoad = (_save: SaveState) => {}
  let onLoadErr = (_err: string) => {}

  useEffect(() => {
    onLoad = (save: SaveState) => {
      setState({
        save,
        config: getConfig(save),
      })
    }
    onLoadErr = (err: any) => {
      console.warn(err)
    }

    return () => {
      onLoad = () => {}
      onLoadErr = () => {}
    }
  }, [])

  return (
    <Root>
      <IconButton onClick={() => load().then(onLoad).catch(onLoadErr)}>
        <LoadIcon />
      </IconButton>
      {state !== null && (
        <Popup title="Load Configuration" onClose={() => setState(null)}>
          <SaveConfig
            config={state.config}
            onChange={(newConfig) =>
              setState({
                ...state,
                config: newConfig,
              })
            }
          />
          <Sp />
          <Button onClick={() => )}>Save</Button>
        </Popup>
      )}
    </Root>
  )
}

function SaveConfig({
  config,
  onChange,
}: {
  config: SaveConfig
  onChange: (newConfig: SaveConfig) => void
}) {
  return (
    <>
      {saveTypes.map((saveType) => {
        return (
          <CheckItem>
            <Checkbox
              checked={config[saveType]}
              onChange={(e) =>
                onChange({
                  ...config,
                  [saveType]: e.target.checked,
                })
              }
              size="small"
            />
            {display(saveType)}
          </CheckItem>
        )
      })}
    </>
  )
}

const Root = styled.div`
  position: relative;
`

const CheckItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 1rem;
`

const Sp = styled.div`
  height: 1rem;
`
