import React from 'react'
import { Fixture } from '../../engine/dmxFixtures'
import { useTypedSelector } from '../../redux/store'

type Props = {
  fixture: Fixture
}

export default function MyUniverseFixture({ fixture }: Props) {
  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[fixture.type])
  const numChannels = fixtureType.channels.length
  const start = fixture.channelNum
  const end = start + numChannels - 1

  const channelString = (numChannels > 1) ? `${start} ... ${end}` : `${start}`

  const height = 4
  const width = 6 // + (numChannels - 1) * 2

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
      <div style={{ display: 'flex', alignItems: 'center'}}>
        <span>{fixtureType.name}</span><span style={{fontSize: '0.9rem', color: 'fff7', marginLeft: '0.5rem'}}>{fixtureType.manufacturer}</span>
      </div>
    </div>
  )
}
