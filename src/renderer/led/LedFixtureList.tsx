import { useDmxSelector } from 'renderer/redux/store'
import { indexArray } from 'shared/util'
import styled from 'styled-components'
import LedFixtureDefinition from './LedFixtureDefinition'
import AddIcon from '@mui/icons-material/Add'
import { IconButton } from '@mui/material'
import { useDispatch } from 'react-redux'
import { addLedFixture } from 'renderer/redux/dmxSlice'

interface Props {}

export default function LedFixtureList({}: Props) {
  const numLedFixtures = useDmxSelector((dmx) => dmx.led.ledFixtures.length)
  const dispatch = useDispatch()

  return (
    <Root>
      <Title>Led Fixtures</Title>
      {indexArray(numLedFixtures).map((i) => (
        <LedFixtureDefinition key={i} index={i} />
      ))}
      <IconButton
        style={{ color: '#fff' }}
        onClick={() => {
          dispatch(addLedFixture())
        }}
      >
        <AddIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`
