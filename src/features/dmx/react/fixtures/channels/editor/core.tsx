import {
  ChannelType,
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  FixtureChannel,
} from 'features/dmx/shared/dmxFixtures'
import NumberField from '../../../../../ui/react/base/NumberField'
import { FC, createContext, useContext } from 'react'
import styled from 'styled-components'

export const ChannelContext = createContext({
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

export const Row = styled.div`
  display: flex;
  align-items: center;
`

export const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

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
