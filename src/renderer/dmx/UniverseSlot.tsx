import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { Fixture, FixtureType } from '../../shared/dmxFixtures'
import { Slot_t } from './MyUniverse'
import { useDispatch } from 'react-redux'
import {
  setSelectedFixture,
  setFixtureWindowEnabled,
  addFixture,
  removeFixture,
} from '../redux/dmxSlice'
import ToggleButton from '../base/ToggleButton'
import Popup from '../base/Popup'
import { useState } from 'react'
import { TextField, IconButton } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import { clamp } from '../../shared/util'
import { DEFAULT_GROUP } from 'shared/Scenes'

function ChannelSpan({ start, count }: { start: number; count: number }) {
  const end = start + count - 1
  return count == 1 ? (
    <div style={{ fontSize: '0.8rem' }}>{start}</div>
  ) : (
    <div>
      {start} - {end}
    </div>
  )
}

function GapSlot({ ch, count }: { ch: number; count: number }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const [inputCh, setInputCh] = useState(ch)
  const dispatch = useDispatch()
  const dmxState = useDmxSelector((state) => state)
  const applicableFixtures = dmxState.fixtureTypes
    .map((id) => dmxState.fixtureTypesByID[id])
    .filter((ft) => ft.channels.length <= count - (inputCh - ch))

  return (
    <Slot
      style={{ backgroundColor: '#000a' }}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          setPopupOpen(true)
        }
      }}
    >
      {popupOpen && (
        <Popup title="Add Fixture" onClose={() => setPopupOpen(false)}>
          <TextField
            label="Channel"
            value={inputCh.toString()}
            size="small"
            onChange={(e) =>
              setInputCh(clamp(parseInt(e.target.value), ch, ch + count - 1))
            }
            type="number"
          />
          {applicableFixtures.map((ft) => (
            <FixtureChoice
              key={ft.id}
              fixtureType={ft}
              onClick={() => {
                setPopupOpen(false)
                dispatch(
                  addFixture({
                    ch: inputCh,
                    type: ft.id,
                    window: {},
                    group: DEFAULT_GROUP,
                  })
                )
              }}
            />
          ))}
        </Popup>
      )}
      <GSRoot>
        <ChannelSpan start={ch} count={count} />
        <GSAdd>
          <AddIcon />
        </GSAdd>
      </GSRoot>
    </Slot>
  )
}

const GSRoot = styled.div`
  display: flex;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  position: relative;
`

const GSAdd = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  :hover {
    opacity: 1;
  }
`

function FixtureChoice({
  fixtureType,
  onClick,
}: {
  fixtureType: FixtureType
  onClick: () => void
}) {
  return (
    <RCRoot onClick={onClick}>
      {fixtureType.name} ({fixtureType.manufacturer})
    </RCRoot>
  )
}

const RCRoot = styled.div`
  font-size: 1rem;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  color: ${(props) => props.theme.colors.text.secondary};
  cursor: pointer;
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`

function FixtureSlot({ fixture, index }: { fixture: Fixture; index: number }) {
  const fixtureType = useDmxSelector(
    (state) => state.fixtureTypesByID[fixture.type]
  )
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const dispatch = useDispatch()
  const count = fixtureType.channels.length
  const start = fixture.ch
  const isSelected = activeFixture === index
  function setWindowEnabled(dimension: 'x' | 'y', isEnabled: boolean) {
    return (_e: React.MouseEvent) => {
      dispatch(
        setFixtureWindowEnabled({
          dimension: dimension,
          index: index,
          isEnabled: isEnabled,
        })
      )
    }
  }
  const style = isSelected
    ? {
        border: '2px solid white',
      }
    : undefined
  return (
    <Slot
      onClick={(e) => {
        if (!e.defaultPrevented) {
          e.preventDefault()
          dispatch(setSelectedFixture(index))
        }
      }}
      style={style}
    >
      <ChannelSpan start={start} count={count} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>{fixtureType.name}</div>
      </div>
      {isSelected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.9rem',
            zIndex: 1,
          }}
        >
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
          <IconButton
            onClick={(e) => {
              e.preventDefault()
              dispatch(removeFixture(index))
            }}
          >
            <RemoveIcon />
          </IconButton>
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'fff7' }}>
          {fixtureType.manufacturer}
        </div>
      )}
    </Slot>
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

const height = 5
const width = 7

const Slot = styled.div`
  height: ${height}rem;
  padding: 0.5rem;
  min-width: ${width}rem;
  margin-right: 0.3rem;
  margin-bottom: 0.3rem;
  color: #fff8;
  background-color: '#000';
  display: 'flex';
  justify-content: 'center';
  align-items: 'center';
  border: 1px solid #fff8;
  :hover {
    border: 1px solid #fffc;
    cursor: pointer;
    color: #fffc;
  }
  box-sizing: border-box;
  position: relative;
`
