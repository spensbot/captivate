import { useState } from 'react'
import { useDmxSelector } from '../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { IconButton, Button } from '@mui/material'
import { addFixtureType } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { FixtureType, initFixtureType } from '../../shared/dmxFixtures'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import {
  captivateFileFilters,
  getDefaultFixtureLibraryPath,
  loadFile,
  saveFixtureLibraryToDefaultPath,
} from '../autosave'
import {
  cloneFixtureType,
  parseFixtureLibrary,
  serializeFixtureLibrary,
} from '../../shared/fixtureLibrary'
import QlcFixtureBrowserModal from './QlcFixtureBrowserModal'

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
  const [isQlcModalOpen, setIsQlcModalOpen] = useState(false)

  function addImportedFixtures(importedFixtures: FixtureType[]) {
    for (const importedFixture of importedFixtures) {
      dispatch(addFixtureType(cloneFixtureType(importedFixture)))
    }
  }

  async function importFixtures() {
    try {
      const serialized = await loadFile('Import Fixtures', [
        captivateFileFilters.captivateFixtures,
        captivateFileFilters.qlcFixtures,
      ])
      const importedFixtures = parseFixtureLibrary(serialized)
      addImportedFixtures(importedFixtures)
    } catch (err) {
      console.warn(err)
      const message =
        err instanceof Error ? err.message : 'Unknown fixture import error.'
      window.alert(`Fixture import failed: ${message}`)
    }
  }

  async function exportFixtures() {
    try {
      const serialized = serializeFixtureLibrary(fixtureTypes)
      const savedPath = await saveFixtureLibraryToDefaultPath(serialized)
      window.alert(`Fixture database saved to:\n${savedPath}`)
    } catch (err) {
      console.warn(err)
      const fallbackPath = await getDefaultFixtureLibraryPath().catch(
        () => 'default fixture library path'
      )
      window.alert(
        `Failed to save fixture database to:\n${fallbackPath}\n\n${
          err instanceof Error ? err.message : 'Unknown save error.'
        }`
      )
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
            onClick={() => void exportFixtures()}
            title="Save all fixtures in this project to the default fixture database file"
          >
            Save Fixture Database
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
        <Popup title="Add Fixture" onClose={() => setIsPopup(false)}>
          <PopupActions>
            <Button
              variant="outlined"
              onClick={() => {
                setIsPopup(false)
                void importFixtures()
              }}
              title="Import fixture definitions from file"
            >
              Import From File
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                dispatch(addFixtureType(initFixtureType()))
                setIsPopup(false)
              }}
              title="Create a new custom fixture"
            >
              Create New
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setIsPopup(false)
                setIsQlcModalOpen(true)
              }}
              title="Search online fixture repositories and import fixture definitions"
            >
              Search For Fixture Online
            </Button>
          </PopupActions>
        </Popup>
      )}
      <QlcFixtureBrowserModal
        open={isQlcModalOpen}
        onClose={() => setIsQlcModalOpen(false)}
        onImportFixtures={addImportedFixtures}
      />
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

const PopupActions = styled.div`
  width: 20rem;
  display: grid;
  gap: 0.65rem;
`

