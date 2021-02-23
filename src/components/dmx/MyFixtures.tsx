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
import { saveFile, loadFile } from '../../util/saveload_renderer'
import { ipcRenderer } from 'electron';

function loadUniverse() {
  ipcRenderer.invoke('test', 'load').then(res => {
    console.log(res)
  }).catch(err => {
    console.log(err)
  })
  // loadFile('Load Universe', null).then(string => {
  //   console.log(string)
  // }).catch(err => {
  //   console.log(err)
  // })
}

function saveUniverse() {
  ipcRenderer.invoke('test', 'save').then(res => {
    console.log(res)
  }).catch(err => {
    console.log(err)
  })
//   saveFile('Save Universe', null).then(err => {
//     if (err) {
//       console.log(err)
//     }
//   }).catch(err => {
//     console.log(err)
//   })
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
    <div style={{ height: '100%', overflow: 'scroll', padding: '0.5rem' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ fontSize: '1.5rem' }}>Fixtures</div>
        <div style={{ flex: '1 0 0' }} />
        <IconButton onClick={loadUniverse}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={saveUniverse}>
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
