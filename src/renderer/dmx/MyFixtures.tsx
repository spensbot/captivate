import { ReactNode, useState } from 'react'
import { useDmxSelector } from '../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { Autocomplete, IconButton, TextField, Button } from '@mui/material'
import { addFixtureType } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { FixtureType, initFixtureType } from '../../shared/dmxFixtures'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import {
  fixtureForId,
  getFixtureSearchIds,
  fuzzySearch,
} from '../../shared/fixtureDb'
import { captivateFileFilters, loadFile, saveFile } from '../autosave'
import {
  cloneFixtureType,
  parseFixtureLibrary,
  serializeFixtureLibrary,
} from '../../shared/fixtureLibrary'

export default function MyFixtures() {
  const fixtureTypeIds = useDmxSelector((state) => state.fixtureTypes)
  const fixtureTypesByID = useDmxSelector((state) => state.fixtureTypesByID)
  const fixtureTypes = fixtureTypeIds
    .map((fixtureTypeID) => fixtureTypesByID[fixtureTypeID])
    .filter((fixture): fixture is FixtureType => fixture !== undefined)

  const dispatch = useDispatch()
  const elements = fixtureTypes.map((fixtureType) => {
    return <MyFixture key={fixtureType.id} id={fixtureType.id} />
  })
  const [isPopup, setIsPopup] = useState(false)
  const [search, setSearch] = useState('')

  async function importFixtures() {
    try {
      const serialized = await loadFile('Import Fixtures', [
        captivateFileFilters.captivateFixtures,
      ])
      const importedFixtures = parseFixtureLibrary(serialized)
      for (const importedFixture of importedFixtures) {
        dispatch(addFixtureType(cloneFixtureType(importedFixture)))
      }
    } catch (err) {
      console.warn(err)
    }
  }

  async function exportFixtures() {
    if (fixtureTypes.length === 0) return

    try {
      const serialized = serializeFixtureLibrary(fixtureTypes)
      await saveFile('Export Fixtures', serialized, [
        captivateFileFilters.captivateFixtures,
      ])
    } catch (err) {
      console.warn(err)
    }
  }

  return (
    <Root>
      <Header>
        <Title>Fixtures</Title>
        <HeaderButtons>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void importFixtures()}
            title="Import fixtures from a fixture library file"
          >
            Import
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={fixtureTypes.length === 0}
            onClick={() => void exportFixtures()}
            title="Export fixtures in this show to a fixture library file"
          >
            Export
          </Button>
        </HeaderButtons>
      </Header>
      <Items>
        {elements}
        <IconButton
          style={{ color: '#fff' }}
          onClick={() => {
            setIsPopup(true)
          }}
          title="Add fixture"
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
                dispatch(addFixtureType(cloneFixtureType(fixture)))
              }
              setIsPopup(false)
            }}
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
            title="Create a new custom fixture"
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
  gap: 0.5rem;
`

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
`

const Items = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a33 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
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
