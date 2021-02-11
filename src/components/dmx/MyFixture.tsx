import Divider from '../base/Divider'
import React from 'react'
import EditIcon from '@material-ui/icons/Edit';
import { IconButton } from '@material-ui/core';
import { useTypedSelector } from '../../redux/store';
import { useDispatch } from 'react-redux';
import { setEditedFixture, addFixtureType } from '../../redux/dmxSlice';
import MyFixtureEditing from './MyFixtureEditing';

type Props = {
  id: string
}

export default function MyFixture({ id }: Props) {

  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[id])
  const editedFixture = useTypedSelector(state => state.dmx.editedFixture)
  const dispatch = useDispatch()
  
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center'
    },
    name: {
      fontSize: '1rem',
      paddingRight: '0.5rem'
    },
    manufacturer: {
      fontSize: '0.8rem',
      opacity: 0.4
    },
    spacer: {
      flex: '1 0 0'
    }
  }

  if (editedFixture === id) {
    return <MyFixtureEditing id={id} />
  }

  return (
    <>
      <div style={styles.root}>
        {fixtureType.name ? (<span style={styles.name}>{fixtureType.name}</span>) : null}
        {fixtureType.manufacturer ? (<span style={styles.manufacturer}>{fixtureType.manufacturer}</span>) : null}
        <div style={styles.spacer} />
        <IconButton onClick={() => dispatch(setEditedFixture(id))}>
          <EditIcon />
        </IconButton>
      </div>
      <Divider marginY="0rem" />
    </>
  )
}
