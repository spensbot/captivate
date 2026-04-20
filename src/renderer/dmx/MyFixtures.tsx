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
  loadFixtureLibraryFromDefaultPath,
  saveFixtureLibraryToDefaultPath,
} from '../autosave'
import {
  cloneFixtureType,
  parseFixtureLibrary,
  serializeFixtureLibrary,
} from '../../shared/fixtureLibrary'
import QlcFixtureBrowserModal from './QlcFixtureBrowserModal'
import { openAppAlert, openAppConfirm } from 'renderer/overlays/appDialogService'
import BusyModal from 'renderer/overlays/BusyModal'
import useStandardBusy from 'renderer/hooks/useStandardBusy'

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
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()

  function addImportedFixtures(importedFixtures: FixtureType[]) {
    for (const importedFixture of importedFixtures) {
      dispatch(addFixtureType(cloneFixtureType(importedFixture)))
    }
  }

  async function loadFixtureDatabaseFromFile() {
    startBusy({
      title: 'Loading Fixture Database',
      message: 'Reading fixture database file...',
    })
    try {
      const serialized = await loadFile('Load Fixture Database', [
        captivateFileFilters.captivateFixtures,
      ])
      if (serialized === null) {
        return
      }
      const importedFixtures = parseFixtureLibrary(serialized)
      addImportedFixtures(importedFixtures)
      stopBusy()
      await openAppAlert({
        title: 'Fixture Database',
        message: `Loaded ${importedFixtures.length} fixture${
          importedFixtures.length === 1 ? '' : 's'
        } from selected database.`,
        level: 'info',
        source: 'Fixtures',
      })
    } finally {
      stopBusy()
    }
  }

  async function loadFixtureDatabase() {
    try {
      startBusy({
        title: 'Loading Fixture Database',
        message: 'Reading saved fixture database...',
      })
      const serialized = await loadFixtureLibraryFromDefaultPath()
      if (serialized !== null) {
        const importedFixtures = parseFixtureLibrary(serialized)
        addImportedFixtures(importedFixtures)
        stopBusy()
        await openAppAlert({
          title: 'Fixture Database',
          message: `Loaded ${importedFixtures.length} fixture${
            importedFixtures.length === 1 ? '' : 's'
          } from saved fixture database.`,
          level: 'info',
          source: 'Fixtures',
        })
        return
      }

      stopBusy()
      const defaultPath = await getDefaultFixtureLibraryPath()
      const shouldPickFile = await openAppConfirm({
        title: 'Fixture Database',
        message: `No saved fixture database was found at:\n${defaultPath}\n\nDo you want to pick a fixture database file instead?`,
        confirmLabel: 'Pick File',
        cancelLabel: 'Cancel',
      })
      if (shouldPickFile) {
        await loadFixtureDatabaseFromFile()
      }
    } catch (err) {
      console.warn(err)
      const message =
        err instanceof Error ? err.message : 'Unknown fixture database error.'
      stopBusy()
      await openAppAlert({
        title: 'Fixture Database',
        message: `Fixture database load failed: ${message}`,
        level: 'error',
        source: 'Fixtures',
      })
    } finally {
      stopBusy()
    }
  }

  async function importFixtures() {
    try {
      startBusy({
        title: 'Importing Fixtures',
        message: 'Reading fixture definitions...',
      })
      const serialized = await loadFile('Import Fixtures', [
        captivateFileFilters.captivateFixtures,
        captivateFileFilters.qlcFixtures,
      ])
      if (serialized === null) {
        return
      }
      const importedFixtures = parseFixtureLibrary(serialized)
      addImportedFixtures(importedFixtures)
    } catch (err) {
      console.warn(err)
      const message =
        err instanceof Error ? err.message : 'Unknown fixture import error.'
      stopBusy()
      await openAppAlert({
        title: 'Fixture Import',
        message: `Fixture import failed: ${message}`,
        level: 'error',
        source: 'Fixtures',
      })
    } finally {
      stopBusy()
    }
  }

  async function exportFixtures() {
    try {
      startBusy({
        title: 'Saving Fixture Database',
        message: 'Writing fixture database to disk...',
      })
      const serialized = serializeFixtureLibrary(fixtureTypes)
      const savedPath = await saveFixtureLibraryToDefaultPath(serialized)
      stopBusy()
      await openAppAlert({
        title: 'Fixture Database',
        message: `Fixture database saved to:\n${savedPath}`,
        level: 'info',
        source: 'Fixtures',
      })
    } catch (err) {
      console.warn(err)
      const fallbackPath = await getDefaultFixtureLibraryPath().catch(
        () => 'default fixture library path'
      )
      stopBusy()
      await openAppAlert({
        title: 'Fixture Database',
        message: `Failed to save fixture database to:\n${fallbackPath}\n\n${
          err instanceof Error ? err.message : 'Unknown save error.'
        }`,
        level: 'error',
        source: 'Fixtures',
      })
    } finally {
      stopBusy()
    }
  }

  return (
    <Root>
      <Header>
        <Title>Fixtures</Title>
        <HeaderButtons>
          <HeaderDbButton
            variant="outlined"
            onClick={() => void loadFixtureDatabase()}
            title="Load all fixtures from your saved fixture database"
          >
            Load DB
          </HeaderDbButton>
          <HeaderDbButton
            variant="outlined"
            onClick={() => void exportFixtures()}
            title="Save all fixtures in this project to the default fixture database file"
          >
            Save DB
          </HeaderDbButton>
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
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Working...'}
        message={busyMessage}
        progress={busy?.progress}
      />
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  min-width: 0;
  max-width: 100%;
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
  padding: 0.2rem 0.25rem;
  border-radius: 0.35rem;
  background: rgba(255, 255, 255, 0.04);
`

const HeaderDbButton = styled(Button)`
  min-width: 0;
  padding: 0.14rem 0.45rem;
  font-size: 0.68rem;
  line-height: 1.05;
  text-transform: none;
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

