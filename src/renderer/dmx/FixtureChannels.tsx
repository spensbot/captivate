import { useState } from 'react'
import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { indexArray } from '../../shared/util'
import { initFixtureChannel } from '../../shared/dmxFixtures'
import { addFixtureChannel } from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FixtureChannelItem from './FixtureChannelItem'

interface Props {
  fixtureID: string
  isInUse: boolean
}

export default function FixtureChannels({ fixtureID, isInUse }: Props) {
  const channelCount = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].channels.length
  )
  const hasMaster = useDmxSelector((state) =>
    state.fixtureTypesByID[fixtureID].channels.find(
      (ch) => ch.type === 'master'
    )
      ? true
      : false
  )
  const [editing, setEditing] = useState<number | null>(null)
  const dispatch = useDispatch()

  const indexes = indexArray(channelCount)

  const addChannelButton = isInUse ? null : (
    <IconButton
      onClick={() =>
        dispatch(
          addFixtureChannel({
            fixtureID: fixtureID,
            newChannel: initFixtureChannel('other'),
          })
        )
      }
    >
      <AddIcon />
    </IconButton>
  )

  return (
    <Root>
      <Header>
        <Title>Channels</Title>
        {addChannelButton}
      </Header>
      <Channels>
        {indexes.map((channelIndex) => (
          <FixtureChannelItem
            key={channelIndex}
            fixtureID={fixtureID}
            channelIndex={channelIndex}
            channelCount={channelCount}
            editing={editing}
            setEditing={setEditing}
            hasMaster={hasMaster}
            isInUse={isInUse}
          />
        ))}
      </Channels>
    </Root>
  )
}

const Root = styled.div``

const Header = styled.div`
  display: flex;
  align-items: center;
`

const Title = styled.span`
  font-size: 1.2rem;
  margin: 0.5rem 0;
`

const Channels = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 0.5rem;
`
