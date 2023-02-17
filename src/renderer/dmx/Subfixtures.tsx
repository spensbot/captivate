import { useDmxSelector } from '../redux/store'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useDispatch } from 'react-redux'
import {
  addSubFixture,
  removeSubFixture,
  setActiveSubFixture,
} from 'renderer/redux/dmxSlice'
import { SubFixture } from 'shared/dmxFixtures'
import RemoveIcon from '@mui/icons-material/Remove'
import wrapClick from 'renderer/base/wrapClick'

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
  const activeSubFixture = useDmxSelector((dmx) => dmx.activeSubFixture)
  const dispatch = useDispatch()
  const isActive = activeSubFixture === subFixtureIndex

  console.log(activeSubFixture)

  return (
    <SubFixtureDiv
      isActive={isActive}
      onClick={wrapClick(() => dispatch(setActiveSubFixture(subFixtureIndex)))}
    >
      {subFixture.name}
      {isActive && (
        <div>
          {' '}
          {subFixture.intensity}
          {subFixture.channels}
          asdf
        </div>
      )}
      <Spacer />
      <IconButton
        size="small"
        style={{ margin: '-0.9rem 0' }}
        onClick={wrapClick(() => dispatch(removeSubFixture(subFixtureIndex)))}
      >
        <RemoveIcon />
      </IconButton>
    </SubFixtureDiv>
  )
}

const Root = styled.div``

const SubFixtureDiv = styled.div<{ isActive: boolean }>`
  cursor: pointer;
  padding: 0.5rem;
  /* margin-bottom: 0.3rem; */
  background-color: ${(props) => props.theme.colors.bg.darker};
  display: flex;
  align-items: center;
  color: ${(props) =>
    props.isActive
      ? props.theme.colors.text.primary
      : props.theme.colors.text.secondary};
`

const Spacer = styled.div`
  flex-grow: 1;
`
