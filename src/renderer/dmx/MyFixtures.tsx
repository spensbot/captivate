import { useDmxSelector } from '../redux/store'
import MyFixture from './MyFixture'
import AddIcon from '@mui/icons-material/Add'
import { IconButton } from '@mui/material'
import { addFixtureType, resetDmxState } from '../redux/dmxSlice'
import { useDispatch } from 'react-redux'
import { initFixtureType } from '../../engine/dmxFixtures'
import SaveIcon from '@mui/icons-material/Save'
import PublishIcon from '@mui/icons-material/Publish'
import { saveFile, loadFile, captivateFileFilters } from '../saveload_renderer'
import { store } from '../redux/store'
import styled from 'styled-components'

function loadUniverse() {
  loadFile('Load Universe', [captivateFileFilters.dmx])
    .then((string) => {
      const newUniverse = JSON.parse(string)
      store.dispatch(resetDmxState(newUniverse))
    })
    .catch((err) => {
      console.log(err)
    })
}

function saveUniverse() {
  const data = JSON.stringify(store.getState().dmx)
  saveFile('Save Universe', data, [captivateFileFilters.dmx])
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
          <PublishIcon />
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
