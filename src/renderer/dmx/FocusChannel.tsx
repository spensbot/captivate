import NumberField from 'renderer/base/NumberField'
import { ChannelFocus, DMX_MAX_VALUE, DMX_MIN_VALUE } from '../../shared/dmxFixtures'

interface Props {
  ch: ChannelFocus
  onChange: (newChannel: ChannelFocus) => void
}

export default function FocusChannel({ ch, onChange }: Props) {
  return (
    <>
      <NumberField
        val={ch.default}
        label="Default"
        min={DMX_MIN_VALUE}
        max={DMX_MAX_VALUE}
        onChange={(value) => onChange({ ...ch, default: value })}
      />
      <NumberField
        val={ch.min}
        label="Min"
        min={DMX_MIN_VALUE}
        max={DMX_MAX_VALUE}
        onChange={(value) => onChange({ ...ch, min: value })}
      />
      <NumberField
        val={ch.max}
        label="Max"
        min={DMX_MIN_VALUE}
        max={DMX_MAX_VALUE}
        onChange={(value) => onChange({ ...ch, max: value })}
      />
    </>
  )
}
