import React from 'react'
import { useTypedSelector } from '../redux/store'
import { Fixture } from '../../engine/dmxFixtures'
import { makeStyles } from '@mui/material/styles'
import { Slot_t } from './MyUniverse'
import { useDispatch } from 'react-redux'
import { setSelectedFixture, setFixtureWindowEnabled } from '../redux/dmxSlice'
import ToggleButton from '../base/ToggleButton'

const height = 4
const width = 6

const useStyles = makeStyles({
  root: {
    height: `${height}rem`,
    padding: '0.5rem',
    minWidth: `${width}rem`,
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
    color: '#fff8',
  },
  gap: {
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixture: {
    backgroundColor: '#0004',
    '&:hover': {
      color: '#fffc',
    },
    cursor: 'pointer',
  },
  selected: {
    padding: '0.4rem',
    border: '0.1rem solid #fffa',
    color: '#fffc',
  },
})

function ChannelSpan({ start, count }: { start: number; count: number }) {
  const end = start + count - 1
  return count == 1 ? (
    <div style={{ fontSize: '0.8rem' }}>{start}</div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
      }}
    >
      <div>{start}</div>
      <div>-</div>
      <div>{end}</div>
    </div>
  )
}

function GapSlot({ ch, count }: { ch: number; count: number }) {
  const classes = useStyles()
  const start = ch
  // const end = start + count - 1
  // const channelString = (count > 1) ? `${start} ... ${end}` : `${start}`
  return (
    <div className={`${classes.root} ${classes.gap}`}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ChannelSpan start={start} count={count} />
      </div>
    </div>
  )
}

function FixtureSlot({ fixture, index }: { fixture: Fixture; index: number }) {
  const classes = useStyles()
  const fixtureType = useTypedSelector(
    (state) => state.dmx.fixtureTypesByID[fixture.type]
  )
  const selectedFixture = useTypedSelector((state) => state.dmx.selectedFixture)
  const dispatch = useDispatch()
  const count = fixtureType.channels.length
  const start = fixture.ch
  const isSelected = selectedFixture === index
  function setWindowEnabled(dimension: 'x' | 'y', isEnabled: boolean) {
    return (e: React.MouseEvent) => {
      dispatch(
        setFixtureWindowEnabled({
          dimension: dimension,
          index: index,
          isEnabled: isEnabled,
        })
      )
    }
  }
  return (
    <div
      className={`${classes.root} ${classes.fixture} ${
        isSelected ? classes.selected : null
      }`}
      onClick={() => {
        dispatch(setSelectedFixture(index))
      }}
    >
      <ChannelSpan start={start} count={count} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>{fixtureType.name}</div>
      </div>
      {isSelected ? (
        <div style={{ display: 'flex', fontSize: '0.9rem', zIndex: 1 }}>
          <ToggleButton
            isEnabled={!!fixture.window.x}
            onClick={setWindowEnabled('x', !fixture.window.x)}
          >
            X
          </ToggleButton>
          <ToggleButton
            isEnabled={!!fixture.window.y}
            onClick={setWindowEnabled('y', !fixture.window.y)}
          >
            Y
          </ToggleButton>
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'fff7' }}>
          {fixtureType.manufacturer}
        </div>
      )}
    </div>
  )
}

export default function UniverseSlot({ slot }: { slot: Slot_t }) {
  switch (slot.kind) {
    case 'gap':
      return <GapSlot ch={slot.ch} count={slot.count} />
    case 'fixture':
      return <FixtureSlot fixture={slot.fixture} index={slot.index} />
  }
}
