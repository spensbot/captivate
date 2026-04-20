import styled from 'styled-components'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import { Fixture, FixtureType } from '../../shared/dmxFixtures'
import { Slot_t } from './UniverseSlotTypes'
import { useDispatch } from 'react-redux'
import {
  setSelectedFixture,
  setFixtureWindowEnabled,
  setFixtureName,
  addFixture,
  removeFixture,
} from '../redux/dmxSlice'
import ToggleButton from '../base/ToggleButton'
import Popup from '../base/Popup'
import { useEffect, useRef, useState } from 'react'
import { TextField, IconButton, Tooltip, Button } from '@mui/material'
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
  const applicableFixtures = dmxState.fixtureTypes
    .map((id) => dmxState.fixtureTypesByID[id])
    .filter(
      (ft) =>
        ft !== undefined &&
        ft.channels.length > 0 &&
        ft.channels.length <= count - (inputCh - ch)
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
          {applicableFixtures.map((ft) => (
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
  const fixturePlacementDepthEnabled = useTypedSelector(
    (state) => state.gui.fixturePlacementDepthEnabled
  )
  const showZToggle = fixturePlacementDepthEnabled

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

  function setWindowEnabled(dimension: 'x' | 'y' | 'z', isEnabled: boolean) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dispatch(
        setFixtureWindowEnabled({
          dimension: dimension,
          index: globalIndex,
          isEnabled: isEnabled,
        })
      )
    }
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
          ? 'Selected fixture. Use controls to edit patch window or remove fixture.'
          : 'Click to select this fixture.'
      }
      style={style}
    >
      <AddressLabel>
        <ChannelSpan start={start} count={count} />
      </AddressLabel>
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
            <ControlsRow onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Enable or disable Pan (X) window control">
                <span>
                  <ToggleButton
                    isEnabled={!!fixture.window.x}
                    onClick={setWindowEnabled('x', !fixture.window.x)}
                  >
                    X
                  </ToggleButton>
                </span>
              </Tooltip>
              <Tooltip title="Enable or disable Tilt (Y) window control">
                <span>
                  <ToggleButton
                    isEnabled={!!fixture.window.y}
                    onClick={setWindowEnabled('y', !fixture.window.y)}
                  >
                    Y
                  </ToggleButton>
                </span>
              </Tooltip>
              {showZToggle && (
                <Tooltip title="Enable or disable Depth (Z) window control">
                  <span>
                    <ToggleButton
                      isEnabled={!!fixture.window.z}
                      onClick={setWindowEnabled('z', !fixture.window.z)}
                    >
                      Z
                    </ToggleButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Remove this fixture from the universe">
                <span>
                  <IconButton
                    onClick={(e) => {
                      e.preventDefault()
                      dispatch(removeFixture(globalIndex))
                    }}
                  >
                    <RemoveIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </ControlsRow>
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

const height = 5
const width = 8

const Slot = styled.div`
  height: ${height}rem;
  padding: 0.5rem;
  min-width: ${width}rem;
  margin-right: 0.3rem;
  margin-bottom: 0.3rem;
  color: #fff8;
  background-color: #2f2f2f;
  display: block;
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

const AddressLabel = styled.div`
  position: absolute;
  top: 0.32rem;
  left: 0.38rem;
  font-size: 0.72rem;
  color: #ffffffd8;
  z-index: 2;
`

const MainContent = styled.div`
  position: absolute;
  top: 1.2rem;
  left: 0.35rem;
  right: 0.35rem;
  bottom: 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
`

const FixtureName = styled.div`
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.2;
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
  padding: 0.12rem 0.25rem;
  font-size: 0.76rem;
  line-height: 1.2;
`

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.12rem;
  width: 100%;
  justify-content: flex-end;
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
