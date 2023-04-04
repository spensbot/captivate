import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import Select from '../../../renderer/base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
  AxisDir,
  axisDirList,
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
} from '../../../shared/dmxFixtures'
import NumberField from '../../../renderer/base/NumberField'
import Input from '../../../renderer/base/Input'
import { editFixtureChannel } from '../../../renderer/redux/dmxSlice'
import Checkbox from '../../../renderer/base/LabelledCheckbox'
import HSpad, { ColorChannelProps } from 'renderer/base/HSpad'
import { FixtureChannelItemProps } from './FixtureChannelItem'
import ColorMapChannel from 'features/dmx/react/ColorMapChannel'
import ColorPicker from 'renderer/base/ColorPicker'

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

  function dmxNumberField<Ch extends FixtureChannel, Key extends keyof Ch>(
    ch: Ch,
    field: Key,
    label: string
  ) {
    return (
      <NumberField
        // @ts-ignore  It's gross but it saves so much time here
        val={ch[field]}
        label={label}
        min={DMX_MIN_VALUE}
        max={DMX_MAX_VALUE}
        onChange={(newVal) =>
          updateChannel({
            ...ch,
            [field]: newVal,
          })
        }
      />
    )
  }

  if (ch.type === 'color') {
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
  } else if (ch.type === 'master') {
    return (
      <>
        {dmxNumberField(ch, 'min', 'Min')}
        <Sp2 />
        {dmxNumberField(ch, 'max', 'MAX')}
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
  } else if (ch.type === 'other') {
    return dmxNumberField(ch, 'default', 'Default')
  } else if (ch.type === 'strobe') {
    return (
      <>
        {dmxNumberField(ch, 'default_solid', 'Solid')}
        <Sp2 />
        {dmxNumberField(ch, 'default_strobe', 'Strobe')}
      </>
    )
  } else if (ch.type === 'axis') {
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
            {dmxNumberField(ch, 'min', 'Min')}
            <Sp2 />
            {dmxNumberField(ch, 'max', 'Max')}
          </>
        )}
      </>
    )
  } else if (ch.type === 'colorMap') {
    return (
      <ColorMapChannel
        ch={ch}
        fixtureID={fixtureID}
        channelIndex={channelIndex}
      />
    )
  } else if (ch.type === 'reset') {
    return dmxNumberField(ch, 'resetVal', 'Reset Value')
  } else if (ch.type === 'custom') {
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
        {dmxNumberField(ch, 'default', 'Default')}
        <Sp2 />
        {dmxNumberField(ch, 'min', 'Min')}
        <Sp2 />
        {dmxNumberField(ch, 'max', 'Max')}
      </>
    )
  } else {
    return null
  }
}

const Row = styled.div`
  display: flex;
  align-items: center;
`

const Content = styled.div`
  & > * {
    margin-bottom: 1rem;
  }
`

const Sp2 = styled.div`
  width: 1rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`
