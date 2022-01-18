import styled from 'styled-components'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { indexArray } from '../../util/util'
import Select from '../base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
} from '../../engine/dmxFixtures'
import { colorList, Color } from '../../engine/dmxColors'
import NumberField from '../base/NumberField'
import { editFixtureChannel } from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DragHandleIcon from '@mui/icons-material/DragHandle'

interface Props {
  fixtureID: string
}

export default function FixtureChannels({ fixtureID }: Props) {
  const channelCount = useTypedSelector(
    (state) => state.dmx.fixtureTypesByID[fixtureID].channels.length
  )

  const indexes = indexArray(channelCount)

  return (
    <Root>
      <Title>
        Channels
        <IconButton>
          <AddIcon />
        </IconButton>
      </Title>
      {indexes.map((channelIndex) => (
        <Channel
          key={channelIndex}
          fixtureID={fixtureID}
          channelIndex={channelIndex}
        />
      ))}
    </Root>
  )
}

const Root = styled.div``

const Title = styled.div`
  display: flex;
  align-items: center;
`

interface Props2 {
  fixtureID: string
  channelIndex: number
}

const fieldWidth = '8rem'

function Channel({ fixtureID, channelIndex }: Props2) {
  const ch = useTypedSelector(
    (state) => state.dmx.fixtureTypesByID[fixtureID].channels[channelIndex]
  )
  const dispatch = useDispatch()

  return (
    <Root2>
      <Select
        label="Channel Type"
        val={ch.type}
        items={channelTypes}
        onChange={(newType) =>
          dispatch(
            editFixtureChannel({
              id: fixtureID,
              channelIndex: channelIndex,
              newChannel: initFixtureChannel(newType),
            })
          )
        }
      />
      <Sp2 />
      <Fields ch={ch} fixtureID={fixtureID} channelIndex={channelIndex} />
      <Sp />
      <IconButton>
        <RemoveIcon />
      </IconButton>
      <DragHandleIcon />
    </Root2>
  )
}

const Root2 = styled.div`
  display: flex;
  align-items: center;
`

const Sp = styled.div`
  flex: 1 0 0;
`

const Sp2 = styled.div`
  width: 1rem;
`

interface Props3 extends Props2 {
  ch: FixtureChannel
}

function Fields({ ch, fixtureID, channelIndex }: Props3) {
  const dispatch = useDispatch()

  function updateChannel(newChannel: FixtureChannel) {
    dispatch(
      editFixtureChannel({
        id: fixtureID,
        channelIndex: channelIndex,
        newChannel: newChannel,
      })
    )
  }

  if (ch.type === 'color') {
    return (
      <Select
        label="color"
        val={ch.color}
        items={colorList}
        onChange={(newColor) =>
          updateChannel({
            type: 'color',
            color: newColor as Color,
          })
        }
      />
    )
  } else if (ch.type === 'master') {
    return null
  } else if (ch.type === 'other') {
    return (
      <NumberField
        val={ch.default}
        min={1}
        max={255}
        onChange={(newVal) =>
          updateChannel({
            type: 'other',
            default: newVal,
          })
        }
      />
    )
  } else if (ch.type === 'strobe') {
    return (
      <>
        <NumberField
          val={ch.default_solid}
          min={1}
          max={255}
          onChange={(newVal) =>
            updateChannel({
              ...ch,
              default_solid: newVal,
            })
          }
        />
        <Sp2 />
        <NumberField
          val={ch.default_strobe}
          min={1}
          max={255}
          onChange={(newVal) =>
            updateChannel({
              ...ch,
              default_strobe: newVal,
            })
          }
        />
      </>
    )
  } else {
    return null
  }
}
