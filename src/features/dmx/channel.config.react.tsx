import HSpad, { ColorChannelProps } from 'features/ui/react/base/HSpad'
import {
  DmxNumberField,
  Info,
  Row,
  createChannelComponents,
} from './react/fixtures/channels/editor/core'
import ColorPicker from 'features/ui/react/base/ColorPicker'
import Checkbox from 'features/ui/react/base/LabelledCheckbox'
import Input from 'features/ui/react/base/Input'
import styled from 'styled-components'
import { AxisDir, axisDirList } from './shared/dmxFixtures'
import Select from 'features/ui/react/base/Select'
import ColorMapChannel from './react/fixtures/channels/editor/ColorMapChannel'

const Sp2 = styled.div`
  width: 1rem;
`

export const ChannelComponents = createChannelComponents({
  color: ({ ch, updateChannel }) => {
    const colorProps: ColorChannelProps = {
      hue: ch.color.hue,
      saturation: ch.color.saturation,
      onChange: (newHue, newSaturation) => {
        updateChannel({
          type: 'color',
          color: {
            hue: newHue,
            saturation: newSaturation,
          },
        })
      },
    }

    return (
      <>
        {/* {getCustomColorChannelName(ch.color)} */}
        <ColorPicker {...colorProps} />
        <HSpad {...colorProps} />
      </>
    )
  },
  master: ({ ch, updateChannel }) => {
    return (
      <>
        <DmxNumberField ch={ch} field="min" label="Min" />
        <Sp2 />
        <DmxNumberField ch={ch} field="max" label="MAX" />
        <Sp2 />
        <Checkbox
          label="On/Off"
          checked={ch.isOnOff}
          onChange={(isOnOff) =>
            updateChannel({
              ...ch,
              isOnOff,
            })
          }
        />
      </>
    )
  },
  other: ({ ch }) => {
    return <DmxNumberField ch={ch} field="default" label="Default" />
  },
  strobe: ({ ch }) => {
    return (
      <>
        <DmxNumberField ch={ch} field="default_solid" label="Solid" />
        <Sp2 />
        <DmxNumberField ch={ch} field="default_strobe" label="Strobe" />
      </>
    )
  },
  axis: ({ ch, updateChannel }) => {
    return (
      <>
        <Row>
          <Info>Direction: </Info>
          <Select
            label="Direction:"
            val={ch.dir}
            items={axisDirList}
            onChange={(newAxisDir) =>
              updateChannel({
                ...ch,
                dir: newAxisDir as AxisDir,
              })
            }
          />
        </Row>
        <Checkbox
          label="Fine"
          checked={ch.isFine}
          onChange={(isFine) =>
            updateChannel({
              ...ch,
              isFine,
            })
          }
        />
        {!ch.isFine && (
          <>
            <Sp2 />
            <DmxNumberField ch={ch} field="min" label="Min" />
            <Sp2 />
            <DmxNumberField ch={ch} field="max" label="Max" />
          </>
        )}
      </>
    )
  },
  colorMap: ({ ch, channelIndex, fixtureID }) => {
    return (
      <ColorMapChannel
        ch={ch}
        fixtureID={fixtureID}
        channelIndex={channelIndex}
      />
    )
  },
  reset: ({ ch }) => {
    return <DmxNumberField ch={ch} field="resetVal" label="Reset Value" />
  },
  custom: ({ ch, updateChannel }) => {
    return (
      <>
        <Input
          value={ch.name}
          onChange={(newName) =>
            updateChannel({
              ...ch,
              name: newName,
            })
          }
        />
        <DmxNumberField ch={ch} field="default" label="Default" />
        <Sp2 />
        <DmxNumberField ch={ch} field="min" label="Min" />
        <Sp2 />
        <DmxNumberField ch={ch} field="max" label="Max" />
      </>
    )
  },
})
