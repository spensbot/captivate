import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import Select from '../../../../../ui/react/base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
} from '../../../../shared/dmxFixtures'
import { editFixtureChannel } from '../../../../../fixtures/redux/fixturesSlice'
import { FixtureChannelItemProps } from '../list/FixtureChannelItem'
import { ChannelComponents } from 'features/dmx/channel.config.react'
import { ChannelContext, Info, Row } from './core'

interface Props extends FixtureChannelItemProps {
  ch: FixtureChannel
}

export default function FixtureChannelPopup(props: Props) {
  const { ch, fixtureID, channelIndex } = props
  const dispatch = useDispatch()

  return (
    <Content>
      <Row>
        <Info>Type:</Info>
        <Select
          label="Channel Type"
          val={ch.type}
          items={channelTypes}
          onChange={(newType) =>
            dispatch(
              editFixtureChannel({
                fixtureID: fixtureID,
                channelIndex: channelIndex,
                newChannel: initFixtureChannel(newType),
              })
            )
          }
        />
      </Row>
      <Fields {...props} />
    </Content>
  )
}

function Fields({ ch, fixtureID, channelIndex }: Props) {
  const dispatch = useDispatch()

  function updateChannel(newChannel: FixtureChannel) {
    dispatch(
      editFixtureChannel({
        fixtureID: fixtureID,
        channelIndex: channelIndex,
        newChannel: newChannel,
      })
    )
  }
  const Component = ChannelComponents[ch.type]

  if (!Component) return null
  return (
    <ChannelContext.Provider value={{ updateChannel }}>
      <Component
        // TODO: figure out type, very bad
        ch={ch as never}
        updateChannel={updateChannel}
        channelIndex={channelIndex}
        fixtureID={fixtureID}
      />
    </ChannelContext.Provider>
  )
}

const Content = styled.div`
  & > * {
    margin-bottom: 1rem;
  }
`
