import { useDispatch } from 'react-redux'
import Input from 'renderer/base/Input'
import { updateActiveLedFixture } from 'renderer/redux/dmxSlice'
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
      <Root>
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
          <div key={i}>
            `(${p.x}, ${p.y})`
          </div>
        ))}
      </Root>
    )

  return (
    <Root>
      {def.name}
      <br />
      {`${def.led_count} leds`}
      <br />
      {def.mdns}
    </Root>
  )
}

const Root = styled.div``
