import { LfoShape, normalizeLfoShape } from '../../shared/oscillator'
import { useDispatch } from 'react-redux'
import { useActiveLightScene } from '../redux/store'
import {
  resetModulator,
  removeModulator,
  setModulatorShape,
} from '../redux/controlSlice'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'
import LfoPeriod from './LfoPeriod'
import Divider from '../base/Divider'

type Props = {
  index: number
}

export default function LfoMenu({ index }: Props) {
  const dispatch = useDispatch()

  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const isAudioShape =
    lfo.shape === LfoShape.AudioBand || lfo.shape === LfoShape.AudioEnergy

  return (
    <div
      style={{
        paddingLeft: '0.3rem',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0005',
      }}
    >
      <Select
        labelId="lfo-shape-select-label"
        id="lfo-shape-select"
        value={lfo.shape}
        size="small"
        variant="standard"
        title="Choose the waveform or audio source for this modulator"
        onChange={(e) => {
          dispatch(
            setModulatorShape({
              index,
              shape: normalizeLfoShape(e.target.value),
            })
          )
        }}
      >
        <MenuItem value={LfoShape.Ramp}>Ramp</MenuItem>
        <MenuItem value={LfoShape.Sin}>Sine</MenuItem>
        <MenuItem value={LfoShape.Square}>Square</MenuItem>
        <MenuItem value={LfoShape.Saw}>Saw</MenuItem>
        <MenuItem value={LfoShape.Noise}>Noise</MenuItem>
        <MenuItem value={LfoShape.AudioBand}>Audio Band</MenuItem>
        <MenuItem value={LfoShape.AudioEnergy}>Audio Energy</MenuItem>
      </Select>
      <div style={{ flex: '1 0 0' }} />
      {!isAudioShape && <LfoPeriod index={index} />}
      <Divider vertical color={'#fff3'} />
      <IconButton
        color="primary"
        aria-label="delete"
        size="small"
        title="Reset this motion effect to its default shape and settings"
        onClick={() => dispatch(resetModulator(index))}
      >
        <SettingsBackupRestoreIcon />
      </IconButton>
      <Divider vertical color={'#fff3'} />
      <IconButton
        color="primary"
        aria-label="delete"
        size="small"
        title="Remove this motion effect"
        onClick={() => dispatch(removeModulator(index))}
      >
        <CloseIcon />
      </IconButton>
    </div>
  )
}
