import { useState } from 'react'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { store, applySave, useTypedSelector } from '../../../renderer/redux/store'
import { saveFile, loadFile, captivateFileFilters } from './autosave'
import Popup from 'features/ui/react/base/Popup'
import { Button, Checkbox } from '@mui/material'
import {
  SaveState,
  fixSaveState,
  SaveConfig,
  saveTypes,
  displaySaveType,
  getSaveConfig,
} from 'shared/save'
import { useDispatch } from 'react-redux'
import { setSaving, setLoading } from 'renderer/redux/guiSlice'

export async function load() {
  const serializedSaveState = await loadFile('Load Scenes', [
    captivateFileFilters.captivate,
  ])
  const saveState: SaveState = JSON.parse(serializedSaveState)
  fixSaveState(saveState)
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
  const isSaving = useTypedSelector((state) => state.gui.saving)
  const dispatch = useDispatch()
  const [saveConfig, setSaveConfig] = useState<SaveConfig>({
    light: true,
    visual: true,
    dmx: true,
    device: true,
  })
  return (
    <Root>
      <IconButton onClick={() => dispatch(setSaving(true))}>
        <SaveIcon />
      </IconButton>
      {isSaving && (
        <Popup
          title="Save Configuration"
          onClose={() => dispatch(setSaving(false))}
        >
          <SaveConfig
            config={saveConfig}
            onChange={(newConfig) => setSaveConfig(newConfig)}
          />
          <Sp />
          <Button onClick={() => save(saveConfig)}>Save</Button>
        </Popup>
      )}
    </Root>
  )
}

function Load() {
  const loading = useTypedSelector((state) => state.gui.loading)
  const dispatch = useDispatch()

  const onLoad = (state: SaveState) =>
    dispatch(
      setLoading({
        state,
        config: getSaveConfig(state),
      })
    )

  const onLoadErr = (err: any) => {
    console.warn(err)
  }

  return (
    <Root>
      <IconButton onClick={() => load().then(onLoad).catch(onLoadErr)}>
        <LoadIcon />
      </IconButton>
      {loading !== null && (
        <Popup
          title="Load Configuration"
          onClose={() => dispatch(setLoading(null))}
        >
          <SaveConfig
            config={loading.config}
            valid={getSaveConfig(loading.state)}
            onChange={(newConfig) =>
              dispatch(
                setLoading({
                  ...loading,
                  config: newConfig,
                })
              )
            }
          />
          <Sp />
          <Button onClick={() => dispatch(applySave(loading))}>Load</Button>
        </Popup>
      )}
    </Root>
  )
}

function SaveConfig({
  config,
  valid,
  onChange,
}: {
  config: SaveConfig
  valid?: SaveConfig
  onChange: (newConfig: SaveConfig) => void
}) {
  return (
    <>
      {saveTypes.map((saveType) => {
        const isValid = valid ? valid[saveType] : true
        return (
          <CheckItem key={saveType} isValid={isValid}>
            <Checkbox
              checked={config[saveType]}
              onChange={(e) =>
                onChange({
                  ...config,
                  [saveType]: e.target.checked,
                })
              }
              disabled={!isValid}
              size="small"
            />
            {displaySaveType(saveType)}
          </CheckItem>
        )
      })}
    </>
  )
}

const Root = styled.div`
  position: relative;
`

const CheckItem = styled.div<{ isValid: boolean }>`
  display: flex;
  align-items: center;
  font-size: 1rem;
  opacity: ${(props) => (props.isValid ? 1.0 : 0.5)};
`

const Sp = styled.div`
  height: 1rem;
`
