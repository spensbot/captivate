import React from 'react'
import { Lfo, GetSin, GetRamp, LfoShape } from '../../engine/oscillator'
import { GetValueFromPhase } from '../../engine/oscillator'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import useDragBasic from '../hooks/useDragBasic'
import { incrementPeriod, incrementModulator, removeModulator, setModulatorShape } from '../../redux/modulatorsSlice'
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

type Props = {
  index: number
}

const stepSize = 2
const height = 150
const width = 200
const padding = 5
const width_ = width - padding * 2
const height_ = height - padding * 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#33ff33'

export default function LfoMenu({index}: Props) {
  const dispatch = useDispatch();

  function incrementPeriodBy(amount: number) {
    return () => {
      dispatch(incrementPeriod({index: index, amount: amount}))
    }
  }

  const lfo = useTypedSelector(state => state.modulators[index])

  return (
    <div style={{ margin: '0.5rem', display: 'flex', flexDirection: 'row' }}>
      <Select labelId="lfo-shape-select-label" id="lfo-shape-select" value={lfo.shape}
        onChange={(e) => dispatch(setModulatorShape({ index: index, shape: e.target.value }))}>
        <MenuItem value={LfoShape.Ramp}>Ramp</MenuItem>
        <MenuItem value={LfoShape.Random}>Random</MenuItem>
        <MenuItem value={LfoShape.Sin}>Sin</MenuItem>
      </Select>
      <div style={{padding: '0.5rem', backgroundColor: '#fff3', borderRadius: '0.2rem'}} onClick={incrementPeriodBy(-1)}>-</div>
      <div>{ lfo.period }</div>
      <div style={{padding: '0.5rem', backgroundColor: '#fff3', borderRadius: '0.2rem'}} onClick={incrementPeriodBy(1)}>+</div>
      <IconButton style={{ backgroundColor: '#000c' }} color="primary" aria-label="delete" size="small" onClick={() => dispatch(removeModulator(index))}>
        <CloseIcon />
      </IconButton>
    </div>
  )
}
