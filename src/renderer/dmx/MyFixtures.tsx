import { useDmxSelector } from '../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { IconButton } from '@mui/material'
import { addFixtureType, DmxState } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { initFixtureType } from '../../shared/dmxFixtures'
import SaveIcon from '@mui/icons-material/Save'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import { saveFile, loadFile, captivateFileFilters } from '../saveload_renderer'
import { store, resetUniverse } from '../redux/store'
import styled from 'styled-components'

function loadUniverse() {
  loadFile('Load Universe', [captivateFileFilters.dmx])
    .then((serializedDmxState) => {
      const newDmxState: DmxState = JSON.parse(serializedDmxState)
      store.dispatch(resetUniverse(newDmxState))
    })
    .catch((err) => {
      console.log(err)
    })
}

function saveUniverse() {
  const dmxState: DmxState = store.getState().dmx.present
  const serializedDmxState = JSON.stringify(dmxState)
  saveFile('Save Universe', serializedDmxState, [captivateFileFilters.dmx])
    .then((err) => {
      if (err) {
        console.log(err)
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

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
        <Spacer />
        <IconButton onClick={saveUniverse}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={loadUniverse}>
          <FileOpenIcon />
        </IconButton>
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
`

const Items = styled.div`
  overflow: scroll;
  height: auto;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`

const Spacer = styled.div`
  flex: 1 0 0;
`
