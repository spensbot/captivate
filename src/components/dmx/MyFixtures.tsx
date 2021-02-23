import React from 'react'
import {useTypedSelector} from '../../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@material-ui/icons/Add';
import { IconButton } from '@material-ui/core';
import { addFixtureType } from '../../redux/dmxSlice';
import { useDispatch } from 'react-redux'
import { initFixtureType } from '../../engine/dmxFixtures'
import SaveIcon from '@material-ui/icons/Save';
import GetAppIcon from '@material-ui/icons/GetApp';

export default function MyFixtures() {
  const fixtureTypes = useTypedSelector(state => state.dmx.fixtureTypes)
  const dispatch = useDispatch()
  const elements = fixtureTypes.map(fixtureTypeID => {
    return (
      <MyFixture key={fixtureTypeID} id={fixtureTypeID} />
    )
  })

  return (
    <div style={{ height: '100%', overflow: 'scroll', padding: '0.5rem' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ fontSize: '1.5rem' }}>Fixtures</div>
        <div style={{ flex: '1 0 0' }} />
        <IconButton>
          <SaveIcon />
        </IconButton>
        <IconButton>
          <GetAppIcon />
        </IconButton>
      </div>
      {elements}
      <IconButton style={{ color: '#fff' }} onClick={() => {
        dispatch(addFixtureType(initFixtureType()))
      }}>
        <AddIcon />
      </IconButton>
    </div>
  )
}
