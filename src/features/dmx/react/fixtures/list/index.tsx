import { useDmxSelector } from '../../../../../renderer/redux/store'
import MyFixture from './FixtureItem'
import AddIcon from '@mui/icons-material/Add'
import { IconButton, Autocomplete, TextField, Button } from '@mui/material'
import { addFixtureType } from '../../../../fixtures/redux/fixturesSlice'
import { useDispatch } from 'react-redux'
import { initFixtureType } from 'features/dmx/shared/dmxFixtures'
import styled from 'styled-components'
import { useState, ReactNode } from 'react'
import Popup from 'features/ui/react/base/Popup'
import {
  fixtureForId,
  closestMatches,
  getFixtureSearchIds,
  fuzzySearch,
} from 'features/dmx/react/fixtures/fixtureDb'

export default function MyFixtures() {
  const fixtureTypes = useDmxSelector((state) => state.fixtureTypes)
  const dispatch = useDispatch()
  const elements = fixtureTypes.map((fixtureTypeID) => {
    return <MyFixture key={fixtureTypeID} id={fixtureTypeID} />
  })
  const [isPopup, setIsPopup] = useState(false)
  const [search, setSearch] = useState('')

  let options = closestMatches(search)

  console.log('Its doing stuff')
  console.log(options.length)

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
            setIsPopup(true)
          }}
        >
          <AddIcon />
        </IconButton>
      </Items>
      {isPopup && (
        <Popup title="Search Fixtures" onClose={() => setIsPopup(false)}>
          <Autocomplete
            onChange={(_, search) => {
              const fixture = fixtureForId(search ?? '')
              if (fixture !== undefined) {
                dispatch(addFixtureType(fixture))
              }
              setIsPopup(false)
            }}
            // options={options}
            options={getFixtureSearchIds()}
            filterOptions={(options, state) => {
              return fuzzySearch(state.inputValue, options, 100)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                }}
                // label="Search Fixtures"
                variant="standard"
              />
            )}
            style={{ width: '20rem' }}
          />
          <HorizontalLine>Or</HorizontalLine>
          <Button
            onClick={() => {
              dispatch(addFixtureType(initFixtureType()))
              setIsPopup(false)
            }}
            variant="contained"
          >
            Create New
          </Button>
        </Popup>
      )}
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

const HorizontalLine = ({ children }: { children: ReactNode }) => (
  <Container>
    <Line />
    <Text>{children}</Text>
    <Line />
  </Container>
)

const Line = styled.div`
  height: 1px;
  flex: 1;
  background-color: ${(props) => props.theme.colors.divider};
`

const Container = styled.div`
  display: flex;
  align-items: center;
  margin: 1rem 0 0.5rem 0;
`

const Text = styled.div`
  margin: 0 10px;
  font-size: 1rem;
`
