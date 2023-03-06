import { useDispatch } from 'react-redux'
import Input from 'renderer/base/Input'
import {
  setActiveLedFixture,
  updateActiveLedFixture,
} from 'renderer/redux/dmxSlice'
import { useDmxSelector } from 'renderer/redux/store'
import { LedFixture, MAX_LED_COUNT } from 'shared/ledFixtures'
import styled from 'styled-components'
import NumberField from 'renderer/base/NumberField'

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
        <Input
          value={def.name}
          onChange={(newName) => {
            setField('name', newName)
          }}
        />
        <NumberField
          label="LED Count"
          val={def.led_count}
          onChange={(newCount) => setField('led_count', newCount)}
          min={0}
          max={MAX_LED_COUNT}
        />
        <Input
          value={def.mdns}
          onChange={(newMdns) => {
            setField('name', newMdns)
          }}
        />
        {def.points.map((p, i) => (
          <div key={i}>{`(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`}</div>
        ))}
      </ActiveRoot>
    )

  return (
    <InactiveRoot onClick={() => dispatch(setActiveLedFixture(index))}>
      <Name>{def.name}</Name>
      <Info>{`(${def.led_count}) ${def.mdns}`}</Info>
    </InactiveRoot>
  )
}

const ActiveRoot = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
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
