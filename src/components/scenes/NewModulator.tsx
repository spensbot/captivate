import React from 'react'
import { useDispatch } from 'react-redux';
import AddIcon from '@material-ui/icons/Add';
import { addModulator } from '../../redux/scenesSlice'


export default function NewModulator() {
  const dispatch = useDispatch();

  return (
    <div style={{ width: 70, alignSelf: 'stretch', backgroundColor: '#fff1', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', minHeight: '10rem' }}
    onClick={() => dispatch(addModulator())}>
      <AddIcon />
    </div>
  )
}