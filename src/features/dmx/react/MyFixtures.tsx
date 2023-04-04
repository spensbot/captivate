import { useDmxSelector } from '../../../renderer/redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { IconButton } from '@mui/material'
import { addFixtureType } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { initFixtureType } from 'features/dmx/shared/dmxFixtures'
import styled from 'styled-components'

export default function MyFixtures() {
  const fixtureTypes = useDmxSelector((state) => state.fixtureTypes)
  const dispatch = useDispatch()
  const elements = fixtureTypes.map((fixtureTypeID) => {
    return <MyFixture key={fixtureTypeID} id={fixtureTypeID} />
  })

  return (
    <Root>
      <Header>
        <Title>Fixtures</Title>
      </Header>
      <Items style={{ overflow: 'scroll', height: 'auto' }}>
        {elements}
        <IconButton
          style={{ color: '#fff' }}
          onClick={() => {
            dispatch(addFixtureType(initFixtureType()))
          }}
        >
          <AddIcon />
        </IconButton>
      </Items>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  padding: 1rem;
  background-color: ${(props) => props.theme.colors.bg.darker};
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: auto;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-top: -0.3rem;
  min-height: 2.5rem;
`

const Items = styled.div`
  overflow: scroll;
  height: auto;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`
