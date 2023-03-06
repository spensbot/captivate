import { useDmxSelector } from 'renderer/redux/store'
import { indexArray } from 'shared/util'
import styled from 'styled-components'
import LedFixtureDefinition from './LedFixtureDefinition'

interface Props {}

export default function LedFixtureList({}: Props) {
  const numLedFixtures = useDmxSelector((dmx) => dmx.led.ledFixtures.length)

  return (
    <Root>
      <Title>Led Fixtures</Title>
      {indexArray(numLedFixtures).map((i) => (
        <LedFixtureDefinition key={i} index={i} />
      ))}
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`
