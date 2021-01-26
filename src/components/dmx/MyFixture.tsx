import Divider from '../base/Divider'
import React from 'react'
import { FixtureType } from '../../engine/dmxFixtures'

type Props = {
  fixtureType: FixtureType
}

export default function MyFixture({fixtureType}: Props) {
  return (
    <div>
      id: {fixtureType.id}
      name: {fixtureType.name}
      manufacturer: {fixtureType.manufacturer}
      <Divider marginY="1rem"/>
    </div>
  )
}
