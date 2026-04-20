import { useActiveFixtureType, useDmxSelector } from '../redux/store'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useDispatch } from 'react-redux'
import {
  addSubFixture,
  assignChannelToSubFixture,
  duplicateSubFixture,
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
  const activeSubFixtureIndex = useDmxSelector((dmx) => dmx.activeSubFixture)

  const dispatch = useDispatch()

  const addSubFixtureButton = (
    <IconButton
      onClick={() => dispatch(addSubFixture())}
      title="Add subfixture"
    >
      <AddIcon />
    </IconButton>
  )

  const duplicateSubFixtureButton = (
    <IconButton
      disabled={subFixtures.length === 0}
      onClick={() => dispatch(duplicateSubFixture(undefined))}
      title="Duplicate last subfixture"
    >
      <ContentCopyIcon />
    </IconButton>
  )

  return (
    <Root>
      <Header>
        <span>SubFixtures</span>
        <SpFill />
        {duplicateSubFixtureButton}
        {addSubFixtureButton}
      </Header>
      {subFixtures.length > 0 && (
        <HelperText>
          {activeSubFixtureIndex === null
            ? 'Select a subfixture (a, b, c...) and click the channel marker on the left to assign channels.'
            : `Editing subfixture ${subFixtureId(
                activeSubFixtureIndex
              )}. Click channel markers on the left to add or remove channels.`}
        </HelperText>
      )}
      {subFixtures.length > 0 && (
        <HelperText>
          Wash-bar emitter placement is auto-distributed across fixture width.
        </HelperText>
      )}
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
          <SubfixtureNameGrow>
            <Input
              value={subFixture.name}
              onChange={setSubFixtureField('name')}
            />
          </SubfixtureNameGrow>
        ) : (
          <SubfixtureNameText title={subFixture.name}>
            {subFixture.name}
          </SubfixtureNameText>
        )}
        <IconButton
          size="small"
          style={{ margin: '-0.9rem 0' }}
          onClick={wrapClick(() =>
            dispatch(duplicateSubFixture(subFixtureIndex))
          )}
          title="Duplicate this subfixture"
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
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

const Root = styled.div`
  min-width: 0;
  max-width: 100%;
`

const Header = styled.div`
  display: flex;
  align-items: center;
`

const SpFill = styled.div`
  flex: 1 0 0;
`

const HelperText = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-top: -0.1rem;
  margin-bottom: 0.5rem;
`

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
  flex-wrap: wrap;
  gap: 0.25rem;
  min-width: 0;
`

const SubfixtureNameGrow = styled.div`
  flex: 1 1 8rem;
  min-width: 0;
  max-width: 100%;
`

const SubfixtureNameText = styled.span`
  flex: 1 1 8rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
      title={
        isActive
          ? 'Subfixture selected for channel assignment'
          : 'Select this subfixture for channel assignment'
      }
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

  const actionDescription =
    activeSubFixtureIndex === null
      ? subFixtureIndex === null
        ? 'Select a subfixture above, then click to assign this channel'
        : `Assigned to subfixture ${subFixtureId(
            subFixtureIndex
          )}. Click to select it`
      : isPartOfActiveSubfixture
      ? `Click to remove from subfixture ${subFixtureId(activeSubFixtureIndex)}`
      : `Click to assign to subfixture ${subFixtureId(activeSubFixtureIndex)}`

  if (subfixtureCount === 0) return null

  return (
    <Toggle
      style={{
        borderColor: `rgba(255, 255, 255, ${borderA})`,
        backgroundColor: hsvaForCss(hue, 1, 1, bgA),
        color: color,
      }}
      title={actionDescription}
      onClick={(e) => {
        if (e.defaultPrevented) return

        if (isPartOfActiveSubfixture) {
          e.preventDefault()
          dispatch(removeChannelFromSubFixtures({ channelIndex }))
        } else if (activeSubFixtureIndex !== null) {
          e.preventDefault()
          dispatch(
            assignChannelToSubFixture({
              channelIndex,
              subFixtureIndex: activeSubFixtureIndex,
            })
          )
        } else if (subFixtureIndex !== null) {
          e.preventDefault()
          dispatch(setActiveSubFixture(subFixtureIndex))
        }
      }}
    >
      {subFixtureIndex !== null
        ? subFixtureId(subFixtureIndex)
        : activeSubFixtureIndex !== null
        ? '+'
        : ''}
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
