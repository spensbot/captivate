import React from 'react'
import { LfoShape } from '../../engine/oscillator'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import { resetModulator, removeModulator, setModulatorShape } from '../../redux/modulatorsSlice'
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';
import LfoPeriod from './LfoPeriod'

type Props = {
  index: number
} 

export default function LfoMenu({index}: Props) {
  const dispatch = useDispatch();

  const lfo = useTypedSelector(state => state.modulators[index].lfo)

  return (
    <div style={{ padding: '0.3rem', display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: '#0005' }}>
      <Select labelId="lfo-shape-select-label" id="lfo-shape-select" value={lfo.shape}
        onChange={(e) => dispatch(setModulatorShape({ index: index, shape: e.target.value }))}>
        <MenuItem value={LfoShape.Ramp}>Ramp</MenuItem>
        <MenuItem value={LfoShape.Random}>Random</MenuItem>
        <MenuItem value={LfoShape.Sin}>Sin</MenuItem>
      </Select>
      
      <LfoPeriod index={index}/>

      <IconButton style={{ backgroundColor: '#000c' }} color="primary" aria-label="delete" size="small" onClick={() => dispatch(resetModulator(index))}>
        <SettingsBackupRestoreIcon />
      </IconButton>
      <IconButton style={{ backgroundColor: '#000c' }} color="primary" aria-label="delete" size="small" onClick={() => dispatch(removeModulator(index))}>
        <CloseIcon />
      </IconButton>
    </div>
  )
}
