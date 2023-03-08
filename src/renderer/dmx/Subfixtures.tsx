import { useActiveFixtureType, useDmxSelector } from '../redux/store'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useDispatch } from 'react-redux'
import {
  addSubFixture,
  assignChannelToSubFixture,
  removeChannelFromSubFixtures,
  removeSubFixture,
  replaceActiveFixtureTypeSubFixture,
  setActiveSubFixture,
} from '../redux/dmxSlice'
import { SubFixture } from '../../shared/dmxFixtures'
import RemoveIcon from '@mui/icons-material/Remove'
import wrapClick from '../base/wrapClick'
import { hsvaForCss, separateHue } from '../../shared/baseColors'
import Input from '../base/Input'
import Slider from 'renderer/base/Slider'
import XyPad from 'renderer/base/XyPad'
import GroupPicker from 'renderer/base/GroupPicker'
import { getSortedGroups } from 'shared/dmxUtil'

export default function Subfixtures() {
  const subFixtures = useDmxSelector((dmx) => {
    if (dmx.activeFixtureType !== null) {
      return dmx.fixtureTypesByID[dmx.activeFixtureType].subFixtures
    } else {
      return []
    }
  })

  const dispatch = useDispatch()

  const addChannelButton = (
    <IconButton onClick={() => dispatch(addSubFixture())}>
      <AddIcon />
    </IconButton>
  )

  return (
    <Root>
      SubFixtures {addChannelButton}
      {subFixtures.map((sf, sfIndex) => (
        <SubFixture key={sfIndex} subFixture={sf} subFixtureIndex={sfIndex} />
      ))}
    </Root>
  )
}

function SubFixture({
  subFixture,
  subFixtureIndex,
}: {
  subFixture: SubFixture
  subFixtureIndex: number
}) {
  const activeSubFixtureIndex = useDmxSelector((dmx) => dmx.activeSubFixture)
  const dispatch = useDispatch()
  const isActive = activeSubFixtureIndex === subFixtureIndex
  const dmx = useDmxSelector((dmx) => dmx)
  const allGroups = getSortedGroups(
    dmx.universe,
    dmx.fixtureTypes,
    dmx.fixtureTypesByID
  )

  function setSubFixtureField<
    Key extends keyof SubFixture,
    Val extends SubFixture[Key]
  >(field: Key): (newVal: Val) => void {
    return (newVal) => {
      dispatch(
        replaceActiveFixtureTypeSubFixture({
          subFixtureIndex,
          subFixture: {
            ...subFixture,
            [field]: newVal,
          },
        })
      )
    }
  }

  return (
    <SubFixtureDiv isActive={isActive}>
      <Row>
        <SubFixtureToggle subFixtureIndex={subFixtureIndex} />
        {isActive ? (
          <Input
            value={subFixture.name}
            onChange={setSubFixtureField('name')}
          />
        ) : (
          subFixture.name
        )}
        <IconButton
          size="small"
          style={{ margin: '-0.9rem 0' }}
          onClick={wrapClick(() => dispatch(removeSubFixture(subFixtureIndex)))}
        >
          <RemoveIcon />
        </IconButton>
      </Row>
      {isActive && (
        <>
          <Sp />
          <Slider
            value={subFixture.intensity}
            orientation="horizontal"
            onChange={setSubFixtureField('intensity')}
          />
          <Sp />
          <XyPad
            x={subFixture.relative_window?.x?.pos ?? 0.5}
            y={subFixture.relative_window?.y?.pos ?? 0.5}
            onChange={(newX, newY) =>
              setSubFixtureField('relative_window')({
                x: { pos: newX, width: 0 },
                y: { pos: newY, width: 0 },
              })
            }
          />
          <GroupPicker
            groups={subFixture.groups}
            availableGroups={allGroups}
            addGroup={(g) => {
              const set = new Set(subFixture.groups)
              set.add(g)
              setSubFixtureField('groups')(Array.from(set))
            }}
            removeGroup={(g) => {
              const set = new Set(subFixture.groups)
              set.delete(g)
              setSubFixtureField('groups')(Array.from(set))
            }}
          />
        </>
      )}
    </SubFixtureDiv>
  )
}

const Root = styled.div``

const SubFixtureDiv = styled.div<{ isActive: boolean }>`
  padding: 0.5rem;
  /* margin-bottom: 0.3rem; */
  background-color: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) =>
    props.isActive
      ? props.theme.colors.text.primary
      : props.theme.colors.text.secondary};
`

const Sp = styled.div`
  height: 1rem;
  width: 1rem;
`

const Row = styled.div`
  display: flex;
  align-items: center;
`

export function SubFixtureToggle({
  subFixtureIndex,
}: {
  subFixtureIndex: number
}) {
  const activeSubFixtureIndex = useDmxSelector((dmx) => dmx.activeSubFixture)
  const subfixtureCount =
    useActiveFixtureType((ft) => ft.subFixtures.length) ?? 0
  const dispatch = useDispatch()
  const isActive = activeSubFixtureIndex === subFixtureIndex

  const hue = separateHue(subfixtureCount, subFixtureIndex)
  const a = isActive ? 1.0 : 0.5
  const color = isActive ? 'black' : 'white'

  return (
    <Toggle
      style={{
        borderColor: 'white',
        backgroundColor: hsvaForCss(hue, 1, 1, a),
        color: color,
      }}
      onClick={wrapClick(() =>
        isActive
          ? dispatch(setActiveSubFixture(null))
          : dispatch(setActiveSubFixture(subFixtureIndex))
      )}
    >
      {subFixtureId(subFixtureIndex)}
    </Toggle>
  )
}

export function ChannelToggle({ channelIndex }: { channelIndex: number }) {
  const activeSubFixtureIndex = useDmxSelector((dmx) => dmx.activeSubFixture)
  const subfixtureCount =
    useActiveFixtureType((ft) => ft.subFixtures.length) ?? 0
  const subFixtureIndex = useActiveFixtureType((ft) => {
    let sfi = 0
    for (const sf of ft.subFixtures) {
      for (const chi of sf.channels) {
        if (chi === channelIndex) {
          return sfi
        }
      }
      sfi += 1
    }
    return null
  })
  const dispatch = useDispatch()
  const isPartOfActiveSubfixture =
    activeSubFixtureIndex !== null && subFixtureIndex === activeSubFixtureIndex

  const hue = separateHue(subfixtureCount, subFixtureIndex ?? 0)
  const bgA =
    subFixtureIndex === null ? 0.0 : isPartOfActiveSubfixture ? 1.0 : 0.5
  const borderA = activeSubFixtureIndex === null ? 0.5 : 1.0
  const color = isPartOfActiveSubfixture ? 'black' : 'white'

  if (subfixtureCount === 0) return null

  return (
    <Toggle
      style={{
        borderColor: `rgba(255, 255, 255, ${borderA})`,
        backgroundColor: hsvaForCss(hue, 1, 1, bgA),
        color: color,
      }}
      onClick={wrapClick(() => {
        if (isPartOfActiveSubfixture) {
          dispatch(removeChannelFromSubFixtures({ channelIndex }))
        } else if (activeSubFixtureIndex !== null) {
          dispatch(
            assignChannelToSubFixture({
              channelIndex,
              subFixtureIndex: activeSubFixtureIndex,
            })
          )
        }
      })}
    >
      {subFixtureIndex !== null && subFixtureId(subFixtureIndex)}
    </Toggle>
  )
}

function subFixtureId(subFixtureIndex: number): string {
  return String.fromCharCode(subFixtureIndex + 97)
}

const Toggle = styled.div`
  width: 1rem;
  height: 1rem;
  border-radius: 1rem;
  border: 1px solid;
  margin-right: 0.5rem;
  flex: 0 0 auto;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
`
