import React from 'react'
import { Fixture } from '../engine/dmxFixtures'

type Props = {
  fixture: Fixture
}

export default function MyUniverseFixture({fixture}: Props) {
  const start = fixture.channelNum
  const numChannels = fixture.type.channels.length
  const end = start + numChannels - 1

  const channelString = (numChannels > 1) ? `${start} - ${end}` : `${start}`
  let idString = fixture.type.manufacturer || ""
  idString += " - "
  idString += fixture.type.name || ""

  const height = 6
  const width = height + (numChannels - 1) * 2

  const styles: React.CSSProperties = {
    height: `${height}rem`,
    padding: '0.5rem',
    backgroundColor: '#fff1',
    minWidth: `${width}rem`,
    marginRight: '0.3rem',
    marginBottom: '0.3rem'
  }

  return (
    <div style={styles}>
      {channelString}
      <br />
      {idString}
    </div>
  )
}
