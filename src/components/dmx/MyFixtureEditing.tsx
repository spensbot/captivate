import Divider from '../base/Divider'
import React from 'react'
import { FixtureType } from '../../engine/dmxFixtures'
import DoneIcon from '@material-ui/icons/Done';
import { IconButton, TextField } from '@material-ui/core';
import { useTypedSelector } from '../../redux/store';
import { useDispatch } from 'react-redux';
import { updateFixtureType, setEditedFixture } from '../../redux/dmxSlice';

type Props = {
  id: string
}

export default function MyFixtureEditing({ id }: Props) {

  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[id])
  const editedFixture = useTypedSelector(state => state.dmx.editedFixture)
  const dispatch = useDispatch()
  
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    textField: {
      color: '#fffa'
    },
    button: {
      color: '#fffa'
    }
  }

  return (
    <>
      <div style={styles.root}>
        <TextField style={styles.textField} label="Name" value={fixtureType.name}/>
        <TextField style={styles.textField} label="Manufacturer" value={fixtureType.manufacturer}/>
        <IconButton style={styles.button} onClick={() => dispatch(setEditedFixture(null))}>
          <DoneIcon />
        </IconButton>
      </div>
      <Divider marginY="0rem" />
    </>
  )
}
