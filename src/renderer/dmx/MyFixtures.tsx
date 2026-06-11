import { useState } from 'react'
import { useDmxSelector } from '../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { IconButton, Button } from '@mui/material'
import { addFixtureType } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { FixtureType } from '../../shared/dmxFixtures'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import { captivateFileFilters, loadFile } from '../autosave'
import {
  loadFixtureDatabase,
  saveFixtureDatabase,
} from '../menu/projectSaveLoadActions'
import { cloneFixtureType, parseFixtureLibrary } from '../../shared/fixtureLibrary'
import QlcFixtureBrowserModal from './QlcFixtureBrowserModal'
import FixtureLibraryInfoButton from './FixtureLibraryInfoButton'
import { openAppAlert } from 'renderer/overlays/appDialogService'
import BusyModal from 'renderer/overlays/BusyModal'
import useStandardBusy from 'renderer/hooks/useStandardBusy'
import CustomFixtureCreationWizard from './CustomFixtureCreationWizard'
import FixtureModelLayoutWizard from './FixtureModelLayoutWizard'

export default function MyFixtures() {
  const fixtureTypeIds = useDmxSelector((state) => state.fixtureTypes)
  const fixtureTypesByID = useDmxSelector((state) => state.fixtureTypesByID)
  const fixtureTypes = fixtureTypeIds
    .map((fixtureTypeID) => fixtureTypesByID[fixtureTypeID])
    .filter((fixture): fixture is FixtureType => fixture !== undefined)

  const dispatch = useDispatch()
  const elements = fixtureTypes.map((fixtureType, index) => {
    return <MyFixture key={fixtureType.id} id={fixtureType.id} index={index} />
  })
  const [isPopup, setIsPopup] = useState(false)
  const [isQlcModalOpen, setIsQlcModalOpen] = useState(false)
  const [isCreationWizardOpen, setIsCreationWizardOpen] = useState(false)
  const [modelWizardFixtureId, setModelWizardFixtureId] = useState<string | null>(
    null
  )
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()

  function addImportedFixtures(importedFixtures: FixtureType[]) {
    for (const importedFixture of importedFixtures) {
      dispatch(addFixtureType(cloneFixtureType(importedFixture)))
    }
  }

  async function onLoadFixtureDatabase() {
    try {
      await loadFixtureDatabase()
    } catch (err) {
      console.warn(err)
      const message =
        err instanceof Error ? err.message : 'Unknown fixture database error.'
      await openAppAlert({
        title: 'Fixture Database',
        message: `Fixture database load failed: ${message}`,
        level: 'error',
        source: 'Fixtures',
      })
    }
  }

  async function importFixtures() {
    try {
      startBusy({
        title: 'Importing Fixtures',
        message: 'Reading fixture definitions...',
      })
      const loaded = await loadFile('Import Fixtures', [
        captivateFileFilters.captivateFixtures,
        captivateFileFilters.qlcFixtures,
      ])
      if (loaded === null) {
        return
      }
      const importedFixtures = parseFixtureLibrary(loaded.content)
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

  async function onSaveFixtureDatabase() {
    try {
      await saveFixtureDatabase()
    } catch (err) {
      console.warn(err)
      await openAppAlert({
        title: 'Fixture Database',
        message: `Failed to save fixture database: ${
          err instanceof Error ? err.message : 'Unknown save error.'
        }`,
        level: 'error',
        source: 'Fixtures',
      })
    }
  }

  return (
    <Root>
      <Header>
        <TitleRow>
          <Title>Fixtures</Title>
          <FixtureLibraryInfoButton topic="fixtures-panel" />
        </TitleRow>
      </Header>
      <ListScroll>
        {elements}
        <AddRow>
          <IconButton
            style={{ color: '#fff' }}
            onClick={() => {
              setIsPopup(true)
            }}
            title="Add fixture"
          >
            <AddIcon />
          </IconButton>
        </AddRow>
      </ListScroll>
      <ListFooter>
        <FooterDbButton
          variant="outlined"
          onClick={() => void onLoadFixtureDatabase()}
          title="Load fixture database from the project folder (or choose another file)"
        >
          Load DB
        </FooterDbButton>
        <FooterDbButton
          variant="outlined"
          onClick={() => void onSaveFixtureDatabase()}
          title="Save fixture database to the project folder"
        >
          Save DB
        </FooterDbButton>
      </ListFooter>
      {isPopup && (
        <Popup
          title={
            <PopupTitleRow>
              <span>Add Fixture</span>
              <FixtureLibraryInfoButton topic="add-fixture" />
            </PopupTitleRow>
          }
          onClose={() => setIsPopup(false)}
        >
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
                setIsPopup(false)
                setIsCreationWizardOpen(true)
              }}
              title="Step-by-step wizard to create a new custom fixture"
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
      <CustomFixtureCreationWizard
        open={isCreationWizardOpen}
        onClose={() => setIsCreationWizardOpen(false)}
        onSaved={(fixtureId, options) => {
          if (options.openModelWizard) {
            setModelWizardFixtureId(fixtureId)
          }
        }}
      />
      {modelWizardFixtureId !== null && (
        <FixtureModelLayoutWizard
          open
          fixtureId={modelWizardFixtureId}
          onClose={() => setModelWizardFixtureId(null)}
        />
      )}
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
  padding-bottom: 0.65rem;
  background-color: ${(props) => props.theme.colors.bg.darker};
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-top: -0.3rem;
  min-height: 2.5rem;
  gap: 0.5rem;
  flex: 0 0 auto;
`

const ListScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0 -0.25rem;
  padding: 0 0.25rem;
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

const AddRow = styled.div`
  padding: 0.35rem 0.25rem 0.5rem;
`

const ListFooter = styled.div`
  flex: 0 0 auto;
  display: flex;
  gap: 0.35rem;
  padding: 0.55rem 0 0;
  margin-top: 0.15rem;
  border-top: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
`

const FooterDbButton = styled(Button)`
  flex: 1 1 0;
  min-width: 0;
  padding: 0.22rem 0.45rem;
  font-size: 0.68rem;
  line-height: 1.05;
  text-transform: none;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`

const TitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
`

const PopupTitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
`

const PopupActions = styled.div`
  width: 20rem;
  display: grid;
  gap: 0.65rem;
`

