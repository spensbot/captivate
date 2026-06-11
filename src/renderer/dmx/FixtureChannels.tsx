import { useState } from 'react'
import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { indexArray } from '../../shared/util'
import { initFixtureChannel, subFixtureLabel } from '../../shared/dmxFixtures'
import { addFixtureChannel } from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FixtureChannelItem from './FixtureChannelItem'
import { ChannelsHelpButton } from './fixtureEditorHelpButtons'

interface Props {
  fixtureID: string
  isInUse: boolean
}

export default function FixtureChannels({ fixtureID, isInUse }: Props) {
  const channelCount = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].channels.length
  )
  const subfixtureCount = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].subFixtures.length
  )
  const activeSubFixture = useDmxSelector((state) => state.activeSubFixture)
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
      title="Add DMX channel"
      onClick={() =>
        dispatch(
          addFixtureChannel({
            fixtureID: fixtureID,
            newChannel: initFixtureChannel('custom'),
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
        <TitleRow>
          <Title>Channels</Title>
          <ChannelsHelpButton />
        </TitleRow>
        {addChannelButton}
      </Header>
      {subfixtureCount > 0 && (
        <Hint>
          {activeSubFixture === null
            ? 'Subfixture assignment: select a subfixture above, then click the colored circle on the left of each channel.'
            : `Subfixture ${subFixtureLabel(
                activeSubFixture
              )} selected. Click the colored circle on the left to add or remove channels.`}
        </Hint>
      )}
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

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex: 1 1 auto;
  min-width: 0;
`

const Title = styled.span`
  font-size: 1.2rem;
  margin: 0.5rem 0;
`

const Hint = styled.div`
  margin-bottom: 0.4rem;
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.8rem;
`

const Channels = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 0.5rem;
`

