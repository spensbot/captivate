import React from 'react'
import {useTypedSelector} from '../../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@material-ui/icons/Add'
import { IconButton } from '@material-ui/core'
import { addFixtureType, resetDmxState } from '../../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { initFixtureType } from '../../engine/dmxFixtures'
import SaveIcon from '@material-ui/icons/Save'
import GetAppIcon from '@material-ui/icons/GetApp'
import PublishIcon from '@material-ui/icons/Publish'
import { saveFile, loadFile, captivateFileFilters } from '../../util/saveload_renderer'
import { store } from '../../redux/store'

function loadUniverse() {
  loadFile('Load Universe', [captivateFileFilters.dmx]).then(string => {
    const newUniverse = JSON.parse(string)
    store.dispatch(resetDmxState(newUniverse))
  }).catch(err => {
    console.log(err)
  })
}

function saveUniverse() {
  const data = JSON.stringify( store.getState().dmx )

  saveFile('Save Universe', data, [captivateFileFilters.dmx]).then(err => {
    if (err) {
      console.log(err)
    }
  }).catch(err => {
    console.log(err)
  })
}

export default function MyFixtures() {
  const fixtureTypes = useTypedSelector(state => state.dmx.fixtureTypes)
  const dispatch = useDispatch()
  const elements = fixtureTypes.map(fixtureTypeID => {
    return (
      <MyFixture key={fixtureTypeID} id={fixtureTypeID} />
    )
  })

  return (
    <div style={{
      height: '100%', padding: '0.5rem', backgroundColor: '#0003', borderRight: '1px solid #fff3', display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>Fixtures</div>
        <div style={{ flex: '1 0 0' }} />
        <IconButton onClick={saveUniverse}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={loadUniverse}>
          <PublishIcon />
        </IconButton>
      </div>
      <div style={{overflow: 'scroll', height: 'auto'}}>
        {elements}
        <IconButton style={{ color: '#fff' }} onClick={() => {
          dispatch(addFixtureType(initFixtureType()))
        }}>
          <AddIcon />
        </IconButton>
      </div>
    </div>
  )
}

