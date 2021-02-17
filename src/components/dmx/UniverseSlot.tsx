import React from 'react'
import { useTypedSelector } from '../../redux/store'
import { Fixture } from '../../engine/dmxFixtures'
import { makeStyles } from '@material-ui/core/styles'
import { Slot_t } from './MyUniverse'
import { useDispatch } from 'react-redux'
import { setSelectedFixture } from '../../redux/dmxSlice'

const height = 4
const width = 6

const useStyles = makeStyles({
  root: {
    height: `${height}rem`,
    padding: '0.5rem',
    minWidth: `${width}rem`,
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
    color: "#fff8"
  },
  gap: {
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fixture: {
    backgroundColor: '#0001',
    '&:hover': {
      color: '#fffc'
    },
    cursor: 'pointer'
  },
  selected: {
    padding: '0.4rem',
    border: '0.1rem solid #fffa',
    color: '#fffc'
  }
})

function GapSlot({ ch, count }: {ch: number, count: number}) {
  const classes = useStyles()
  const start = ch
  const end = start + count - 1
  const channelString = (count > 1) ? `${start} ... ${end}` : `${start}`
  return (
    <div className={`${classes.root} ${classes.gap}`}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {channelString}
      </div>
    </div>
  )
}

function FixtureSlot({ fixture, index }: { fixture: Fixture, index: number }) {
  const classes = useStyles()
  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[fixture.type])
  const selectedFixture = useTypedSelector(state => state.dmx.selectedFixture)
  const dispatch = useDispatch()
  const count = fixtureType.channels.length
  const start = fixture.ch
  const end = start + count - 1
  const channelString = (count > 1) ? `${start} ... ${end}` : `${start}`
  return (
    <div className={`${classes.root} ${classes.fixture} ${selectedFixture === index ? classes.selected : null}`} onClick={() => { dispatch(setSelectedFixture(index))} }>
      {channelString}
      <div style={{ display: 'flex', alignItems: 'center'}}>
        <div>{fixtureType.name}</div><div style={{fontSize: '0.9rem', color: 'fff7', marginLeft: '0.5rem'}}>{fixtureType.manufacturer}</div>
      </div>
    </div>
  )
}

export default function UniverseSlot({ slot }: {slot: Slot_t}) {
  switch (slot.kind) {
    case 'gap': return (<GapSlot ch={slot.ch} count={slot.count} />)
    case 'fixture': return (<FixtureSlot fixture={slot.fixture} index={slot.index}/>)
  }
}
