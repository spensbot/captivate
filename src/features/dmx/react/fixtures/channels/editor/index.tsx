import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import Select from '../../../../../ui/react/base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  ChannelType,
} from '../../../../shared/dmxFixtures'
import NumberField from '../../../../../ui/react/base/NumberField'
import { editFixtureChannel } from '../../../../../fixtures/redux/fixturesSlice'
import { FixtureChannelItemProps } from '../list/FixtureChannelItem'

import { FC, createContext, useContext } from 'react'
import { ChannelComponents } from 'features/dmx/channel.config.react'

interface Props extends FixtureChannelItemProps {
  ch: FixtureChannel
}

export const createChannelComponents = <
  T extends {
    [k in ChannelType]: FC<{
      ch: Extract<FixtureChannel, { type: k }>
      updateChannel(newChannel: FixtureChannel): void
      fixtureID: string
      channelIndex: number
    }>
  }
>(
  config: T
) => {
  return config
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

const ChannelContext = createContext({
  updateChannel(_newChannel: FixtureChannel) {},
})

export function DmxNumberField<
  Ch extends FixtureChannel,
  Key extends keyof Ch
>({ ch, field, label }: { ch: Ch; field: Key; label: string }) {
  const channelFixture = useContext(ChannelContext)
  return (
    <NumberField
      // @ts-ignore  It's gross but it saves so much time here
      val={ch[field]}
      label={label}
      min={DMX_MIN_VALUE}
      max={DMX_MAX_VALUE}
      onChange={(newVal) =>
        channelFixture.updateChannel({
          ...ch,
          [field]: newVal,
        })
      }
    />
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

export const Row = styled.div`
  display: flex;
  align-items: center;
`

const Content = styled.div`
  & > * {
    margin-bottom: 1rem;
  }
`

export const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`
