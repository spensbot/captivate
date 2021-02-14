import React from 'react'
import {useTypedSelector} from '../../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@material-ui/icons/Add';
import { IconButton } from '@material-ui/core';
import { setEditedFixture, addFixtureType } from '../../redux/dmxSlice';
import { useDispatch } from 'react-redux'
import { initFixtureType } from '../../engine/dmxFixtures'

export default function MyFixtures() {
  const fixtureTypes = useTypedSelector(state => state.dmx.fixtureTypes)
  const dispatch = useDispatch()
  const elements = fixtureTypes.map(fixtureTypeID => {
    return (
      <MyFixture key={fixtureTypeID} id={fixtureTypeID} />
    )
  })

  return (
    <div style={{height: '100%', overflow: 'scroll', padding: '0.5rem'}}>
      <h1>My Fixtures</h1>
      <br/>
      {elements}
      <IconButton style={{ color: '#fff' }} onClick={() => {
        dispatch(addFixtureType(initFixtureType()))
      }}>
        <AddIcon />
      </IconButton>
    </div>
  )
}
