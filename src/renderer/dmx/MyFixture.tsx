import React from 'react'
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
import EditGroups from './EditGroups'
import Subfixtures from './Subfixtures'
import FixtureModelEditor from './FixtureModelEditor'
import { captivateFileFilters, saveFile } from '../autosave'
import { serializeFixtureLibrary } from '../../shared/fixtureLibrary'

type Props = {
  id: string
}

export default function MyFixture({ id }: Props) {
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

const Root = styled.div`
  margin-bottom: 0.5rem;
  border-radius: 5px;
  border: 1px solid #0000;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
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
      <FixtureModelEditor fixtureType={ft} />
      <Sp />
      <Subfixtures />
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
          disabled={isInUse}
          variant="contained"
          onClick={() => dispatch(deleteFixtureType(ft.id))}
          title="Delete this fixture type from the project"
        >
          Delete Fixture
        </Button>
        <div style={{ flex: '1 0 1rem' }} />
        <EditGroups />
      </Row>
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
