import React, { useState } from 'react'
import { IconButton } from '@mui/material'
import { useDmxSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import {
  setEditedFixture,
  updateFixtureType,
  deleteFixtureType,
} from '../redux/dmxSlice'
import Input from '../base/Input'
import styled from 'styled-components'
import FixtureChannels from './FixtureChannels'
import { Button } from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Subfixtures from './Subfixtures'
import FixtureModelSummary from './FixtureModelSummary'
import { captivateFileFilters, saveFile } from '../autosave'
import { serializeFixtureLibrary } from '../../shared/fixtureLibrary'
import ShareFixtureToLibraryDialog from './ShareFixtureToLibraryDialog'

type Props = {
  id: string
  index: number
}

export default function MyFixture({ id, index }: Props) {
  const ft = useDmxSelector((state) => state.fixtureTypesByID[id])
  const isEditing = useDmxSelector((state) => state.activeFixtureType === id)
  const dispatch = useDispatch()

  const styles: { [key: string]: React.CSSProperties } = {
    name: {
      fontSize: '1rem',
      paddingRight: '0.5rem',
    },
    manufacturer: {
      fontSize: '0.8rem',
      opacity: 0.4,
    },
    channelCount: {
      fontSize: '0.9rem',
      paddingRight: '0.2rem',
    },
    spacer: {
      flex: '1 0 0',
    },
  }

  return (
    <Root
      $striped={index % 2 === 1}
      style={
        isEditing
          ? {
              border: '2px solid white',
              backgroundColor: '#7771',
              padding: '1rem',
            }
          : undefined
      }
    >
      {!isEditing ? (
        <Header
          onClick={() => dispatch(setEditedFixture(isEditing ? null : id))}
        >
          {ft.name ? <span style={styles.name}>{ft.name}</span> : null}
          {ft.manufacturer ? (
            <span style={styles.manufacturer}>{ft.manufacturer}</span>
          ) : null}
          <div style={styles.spacer} />
          <span style={styles.channelCount}>{ft.channels.length}</span>
          <span style={styles.manufacturer}>ch</span>
        </Header>
      ) : (
        <ActiveFixtureType />
      )}
    </Root>
  )
}

const Root = styled.div<{ $striped: boolean }>`
  margin-bottom: 0.15rem;
  border-radius: 5px;
  border: 1px solid #0000;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background-color: ${(p) =>
    p.$striped ? 'rgba(255, 255, 255, 0.045)' : 'rgba(0, 0, 0, 0.12)'};
  :hover {
    border: 1px solid ${(props) => props.theme.colors.divider};
  }
`

const Header = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
`

function ActiveFixtureType() {
  const ft = useDmxSelector((dmx) => {
    if (dmx.activeFixtureType !== null) {
      return dmx.fixtureTypesByID[dmx.activeFixtureType]
    }
    return null
  })
  if (ft === null) return null

  const isInUse = useDmxSelector(
    (state) =>
      state.universe.find((fixture) => fixture.type === ft.id) !== undefined
  )
  const dispatch = useDispatch()
  const [shareOpen, setShareOpen] = useState(false)

  async function exportFixture() {
    if (ft === null) return

    try {
      await saveFile(
        `Export Fixture: ${ft.name}`,
        serializeFixtureLibrary([ft]),
        [captivateFileFilters.captivateFixtures]
      )
    } catch (err) {
      console.warn(err)
    }
  }

  return (
    <>
      <Row>
        <IconButton
          title="Collapse fixture editor"
          onClick={() => {
            dispatch(setEditedFixture(null))
          }}
          style={{ marginRight: '1rem' }}
        >
          <ExpandLessIcon />
        </IconButton>
        <NameColumn>
          <Input
            value={ft.name}
            onChange={(newVal) =>
              dispatch(
                updateFixtureType({
                  ...ft,
                  name: newVal,
                })
              )
            }
            placeholder="Fixture Name"
          />
          <Sp2 />
          <Input
            value={ft.manufacturer || ''}
            onChange={(newVal) =>
              dispatch(
                updateFixtureType({
                  ...ft,
                  manufacturer: newVal,
                })
              )
            }
            placeholder="Manufacturer"
          />
        </NameColumn>
      </Row>
      <Sp2 />

      <FixtureChannels fixtureID={ft.id} isInUse={isInUse} />
      <Sp />
      <Subfixtures />
      <Sp />
      <FixtureModelSummary fixtureType={ft} />
      <Sp />
      <Row>
        <Button
          size="small"
          variant="outlined"
          onClick={() => void exportFixture()}
          title="Export this fixture definition to a fixture library file"
        >
          Export Fixture
        </Button>
        <Sp3 />
        <Button
          size="small"
          variant="outlined"
          onClick={() => setShareOpen(true)}
          title="Submit this fixture to the Captivate Community Library"
        >
          Share to Library…
        </Button>
        <Sp3 />
        <Button
          size="small"
          disabled={isInUse}
          variant="contained"
          onClick={() => dispatch(deleteFixtureType(ft.id))}
          title="Delete this fixture type from the project"
        >
          Delete Fixture
        </Button>
        <div style={{ flex: '1 0 1rem' }} />
      </Row>
      <ShareFixtureToLibraryDialog
        open={shareOpen}
        fixture={ft}
        onClose={() => setShareOpen(false)}
      />
    </>
  )
}

const Sp = styled.div`
  height: 1rem;
  flex: 1 0 0;
`

const Sp2 = styled.div`
  height: 0.5rem;
`

const Sp3 = styled.div`
  width: 0.5rem;
`

const NameColumn = styled.div`
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  row-gap: 0.25rem;
  min-width: 0;
`
