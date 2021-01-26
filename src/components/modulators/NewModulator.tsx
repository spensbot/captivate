import React from 'react'
import { useDispatch } from 'react-redux';
import AddIcon from '@material-ui/icons/Add';
import { GetSin, GetRamp } from '../../engine/oscillator'
import { pushModulator } from '../../redux/modulatorsSlice'


export default function NewModulator() {
  const dispatch = useDispatch();

  return (
    <div style={{ width: 200, height: 150, margin: '1rem', backgroundColor: '#fff3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    onClick={() => dispatch(pushModulator(GetSin()))}>
      <AddIcon />
    </div>
  )
}