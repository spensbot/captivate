import { useDispatch } from 'react-redux'
import Input from 'renderer/base/Input'
import {
  removeLedFixture,
  setActiveLedFixture,
  updateActiveLedFixture,
} from 'features/dmx/redux/dmxSlice'
import { useDmxSelector } from 'renderer/redux/store'
import { LedFixture, MAX_LED_COUNT } from 'shared/ledFixtures'
import styled from 'styled-components'
import NumberField from 'renderer/base/NumberField'
import Dropdown from 'renderer/base/Dropdown'
import { IconButton } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'

interface Props {
  index: number
}

export default function LedFixtureDefinition({ index }: Props) {
  let def = useDmxSelector((dmx) => dmx.led.ledFixtures[index])
  let isActive = useDmxSelector((dmx) => dmx.led.activeFixture === index)

  const dispatch = useDispatch()

  function setField<
    Key extends keyof LedFixture,
    Value extends LedFixture[Key]
  >(key: Key, value: Value) {
    dispatch(
      updateActiveLedFixture({
        ...def,
        [key]: value,
      })
    )
  }

  if (isActive)
    return (
      <ActiveRoot>
        <Row>
          <Dropdown
            isOpen={true}
            onClick={() => dispatch(setActiveLedFixture(null))}
          />
          <div>
            <Input
              value={def.name}
              onChange={(newName) => {
                setField('name', newName)
              }}
            />
            <Sp />
            <Input
              value={def.mdns}
              onChange={(newMdns) => {
                setField('mdns', newMdns)
              }}
            />
            <Sp />
            <NumberField
              label="LED Count"
              val={def.led_count}
              onChange={(newCount) => setField('led_count', newCount)}
              min={0}
              max={MAX_LED_COUNT}
            />
          </div>
        </Row>
      </ActiveRoot>
    )

  return (
    <InactiveRoot>
      <Dropdown
        isOpen={false}
        onClick={() => dispatch(setActiveLedFixture(index))}
      />
      <Name>{def.name}</Name>
      <Info>{`(${def.led_count}) ${def.mdns}`}</Info>
      <div style={{ flex: '1 0 0' }} />
      <IconButton onClick={() => dispatch(removeLedFixture(index))}>
        <RemoveIcon />
      </IconButton>
    </InactiveRoot>
  )
}

const ActiveRoot = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid white;
`

const InactiveRoot = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
`

const Name = styled.div`
  margin-right: 1rem;
`

const Info = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const Row = styled.div`
  display: flex;
  align-items: flex-start;
`

const Sp = styled.div`
  height: 0.5rem;
`
