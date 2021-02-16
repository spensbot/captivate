import React from 'react'
import { useTypedSelector } from '../../redux/store'
import { Fixture, Slot_t } from '../../engine/dmxFixtures'
import { makeStyles } from '@material-ui/core/styles'

type Props = {
  slot: Slot_t
}

const height = 4
const width = 6

const useStyles = makeStyles({
  root: {
    height: `${height}rem`,
    padding: '0.5rem',
    minWidth: `${width}rem`,
    marginRight: '0.3rem',
    marginBottom: '0.3rem'
  },
  gap: {
    backgroundColor: '#000'
  },
  fixture: {
    backgroundColor: '#0001'
  },
  selected: {
    backgroundColor: '#fffa',
    color: '000'
  }
})

function GapSlot({ ch, count }: {ch: number, count: number}) {
  const classes = useStyles()
  const start = ch
  const end = start + count - 1
  const channelString = (count > 1) ? `${start} ... ${end}` : `${start}`
  return (
    <div className={classes.root}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {channelString}
      </div>
    </div>
  )
}

function FixtureSlot({ fixture }: { fixture: Fixture }) {
  const classes = useStyles()
  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[fixture.type])
  const count = fixtureType.channels.length
  const start = fixture.ch
  const end = start + count - 1
  const channelString = (count > 1) ? `${start} ... ${end}` : `${start}`
  return (
    <div className={classes.root}>
      {channelString}
      <div style={{ display: 'flex', alignItems: 'center'}}>
        <span>{fixtureType.name}</span><span style={{fontSize: '0.9rem', color: 'fff7', marginLeft: '0.5rem'}}>{fixtureType.manufacturer}</span>
      </div>
    </div>
  )
}

export default function UniverseSlot({ slot }: Props) {
  switch (slot.kind) {
    case 'gap': return (<GapSlot ch={slot.ch} count={slot.count} />)
    case 'fixture': return (<FixtureSlot fixture={slot.fixture}/>)
  }
}
