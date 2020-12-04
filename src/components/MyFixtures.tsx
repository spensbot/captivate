import React from 'react'
import {useTypedSelector} from '../redux/store'
import MyFixture from './MyFixture'

export default function MyFixtures() {
  const fixtureTypes = useTypedSelector(state => state.dmx.fixtureTypes)
  const elements = Object.entries(fixtureTypes).map(([id, fixtureType]) => {
    return (
      <MyFixture key={id} fixtureType={fixtureType}/>
    )
  })

  return (
    <div>
      <h1>My Fixtures</h1>
      <br/>
      {elements}
    </div>
  )
}
