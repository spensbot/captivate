import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { Fixture, FixtureType } from '../../shared/dmxFixtures'
import { Slot_t } from './UniverseSlotTypes'
import { useDispatch } from 'react-redux'
import {
  setSelectedFixture,
  setFixtureName,
  addFixture,
  removeFixture,
} from '../redux/dmxSlice'
import { removeAtmosFxtr } from '../redux/controlSlice'
import Popup from '../base/Popup'
import { useEffect, useRef, useState } from 'react'
import { TextField, Tooltip, Button } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import { clamp } from '../../math/util'
import { fixtureUniverseColor } from './fixtureColors'

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
  const activeUniverse = useDmxSelector((state) => state.activeUniverse)
  const dmxState = useDmxSelector((state) => state)
  const definedLibraryTypes = dmxState.fixtureTypes
    .map((id) => dmxState.fixtureTypesByID[id])
    .filter((ft) => ft !== undefined && ft.channels.length > 0)
  const hasNoFixtureLibrary = definedLibraryTypes.length === 0
  const applicableFixtures = definedLibraryTypes.filter(
    (ft) => ft.channels.length <= count - (inputCh - ch)
  )

  return (
    <Slot
      style={{ backgroundColor: '#000a' }}
      title="Empty DMX address range. Click to add a fixture here."
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
            title="Start channel for the new fixture"
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!Number.isNaN(value)) {
                setInputCh(clamp(value, ch, ch + count - 1))
              }
            }}
            type="number"
          />
          {applicableFixtures.length === 0 ? (
            <NoFixtureHelp role="status">
              {hasNoFixtureLibrary ? (
                <>
                  There are no fixture types in the fixture library yet. Define at least one
                  fixture under <strong>Fixtures</strong> before you can patch the universe.
                </>
              ) : (
                <>
                  No fixture type fits in this gap from channel {inputCh} with the current
                  selection. The gap may be too narrow, or try moving the start channel.
                </>
              )}
            </NoFixtureHelp>
          ) : (
            applicableFixtures.map((ft) => (
              <FixtureChoice
                key={ft.id}
                fixtureType={ft}
                onClick={() => {
                  setPopupOpen(false)
                  dispatch(
                    addFixture({
                      name: ft.name,
                      ch: inputCh,
                      universe: activeUniverse,
                      type: ft.id,
                      window: {
                        x: { pos: 0.5, width: 0 },
                        y: { pos: 0.5, width: 0 },
                        z: { pos: 1, width: 0 },
                      },
                      groups: [],
                    })
                  )
                }}
              />
            ))
          )}
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
    <RCRoot
      onClick={onClick}
      title="Add this fixture type at the selected channel"
    >
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

const NoFixtureHelp = styled.div`
  margin-top: 0.65rem;
  padding: 0.55rem 0.45rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: ${(props) => props.theme.colors.text.secondary};
  border-radius: 0.28rem;
  border: 1px dashed ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
`

function FixtureSlot({
  fixture,
  globalIndex,
  localIndex,
}: {
  fixture: Fixture
  globalIndex: number
  localIndex: number
}) {
  const fixtureType = useDmxSelector(
    (state) => state.fixtureTypesByID[fixture.type]
  )
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const dispatch = useDispatch()
  const count = fixtureType.channels.length
  const start = fixture.ch
  const isSelected = activeFixture === globalIndex
  const fixtureDisplayName =
    typeof fixture.name === 'string' && fixture.name.trim().length > 0
      ? fixture.name.trim()
      : fixtureType.name
  const [pendingName, setPendingName] = useState(fixtureDisplayName)
  const [revertName, setRevertName] = useState(fixtureDisplayName)
  const [showBlankNameWarning, setShowBlankNameWarning] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setPendingName(fixtureDisplayName)
    setRevertName(fixtureDisplayName)
    if (!isSelected) {
      setShowBlankNameWarning(false)
    }
  }, [fixtureDisplayName, globalIndex, isSelected])

  function handleNameCommit() {
    const trimmedName = pendingName.trim()
    if (trimmedName.length === 0) {
      setShowBlankNameWarning(true)
      return
    }

    dispatch(
      setFixtureName({
        index: globalIndex,
        name: trimmedName,
      })
    )
    setPendingName(trimmedName)
    setRevertName(trimmedName)
  }

  function handleBlankNameUseDefault() {
    dispatch(
      setFixtureName({
        index: globalIndex,
        name: '',
      })
    )
    setPendingName(fixtureType.name)
    setRevertName(fixtureType.name)
    setShowBlankNameWarning(false)
  }

  function handleBlankNameGoBack() {
    setPendingName(revertName)
    setShowBlankNameWarning(false)
    requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  const backgroundColor = fixtureUniverseColor(localIndex)
  const style = {
    backgroundColor,
    ...(isSelected ? { border: '2px solid white' } : {}),
  }

  return (
    <Slot
      onClick={(e) => {
        if (!e.defaultPrevented) {
          e.preventDefault()
          dispatch(setSelectedFixture(globalIndex))
        }
      }}
      title={
        isSelected
          ? 'Selected fixture. Edit name or remove from patch.'
          : 'Click to select this fixture.'
      }
      style={style}
    >
      <HeaderRow onClick={(e) => isSelected && e.stopPropagation()}>
        <AddressLabel>
          <ChannelSpan start={start} count={count} />
        </AddressLabel>
        {isSelected ? (
          <Tooltip title="Remove this fixture from the universe">
            <RemoveButton
              type="button"
              aria-label="Remove fixture"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const fixtureId =
                  typeof fixture.id === 'string' ? fixture.id.trim() : ''
                dispatch(removeFixture(globalIndex))
                if (fixtureId.length > 0) {
                  dispatch(removeAtmosFxtr(fixtureId))
                }
              }}
            >
              <RemoveIcon fontSize="small" />
            </RemoveButton>
          </Tooltip>
        ) : null}
      </HeaderRow>
      <MainContent>
        {isSelected ? (
          <>
            <NameInput
              ref={nameInputRef}
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onBlur={handleNameCommit}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            />
            {showBlankNameWarning && (
              <Popup
                title="Name Required"
                onClose={handleBlankNameGoBack}
              >
                <WarningText>
                  Fixture name cannot be blank.
                </WarningText>
                <WarningActions>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleBlankNameUseDefault}
                  >
                    Use Default
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBlankNameGoBack}
                  >
                    Go Back
                  </Button>
                </WarningActions>
              </Popup>
            )}
          </>
        ) : (
          <FixtureName title={fixtureDisplayName}>{fixtureDisplayName}</FixtureName>
        )}
      </MainContent>
    </Slot>
  )
}

export default function UniverseSlot({ slot }: { slot: Slot_t }) {
  switch (slot.kind) {
    case 'gap':
      return <GapSlot ch={slot.ch} count={slot.count} />
    case 'fixture':
      return (
        <FixtureSlot
          fixture={slot.fixture}
          globalIndex={slot.globalIndex}
          localIndex={slot.localIndex}
        />
      )
  }
}

const height = 3.35
const width = 8

const Slot = styled.div`
  min-height: ${height}rem;
  padding: 0.32rem 0.38rem;
  min-width: ${width}rem;
  margin-right: 0.3rem;
  margin-bottom: 0.3rem;
  color: #fff8;
  background-color: #2f2f2f;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  border: 1px solid #fff8;
  :hover {
    border: 1px solid #fffc;
    cursor: pointer;
    color: #fffc;
  }
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem;
  min-height: 1.15rem;
  flex: 0 0 auto;
`

const AddressLabel = styled.div`
  font-size: 0.72rem;
  color: #ffffffd8;
  line-height: 1.1;
  min-width: 0;
`

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin: 0;
  padding: 0.05rem;
  border: 0;
  border-radius: 0.2rem;
  background: transparent;
  color: #ffffffcc;
  cursor: pointer;

  &:hover {
    color: #fff;
    background: #0006;
  }
`

const MainContent = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const FixtureName = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  color: #fffef2;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NameInput = styled.input`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #090f1fdd;
  color: #eef4ff;
  border: 1px solid #ffffff55;
  border-radius: 0.2rem;
  padding: 0.08rem 0.22rem;
  font-size: 0.74rem;
  line-height: 1.15;
`

const WarningText = styled.div`
  color: ${(props) => props.theme.colors.text.primary};
  margin-bottom: 0.9rem;
`

const WarningActions = styled.div`
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
`
