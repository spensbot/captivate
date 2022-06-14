import { useState } from 'react'
import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { indexArray } from '../../shared/util'
import Select from '../base/Select'
import {
  FixtureChannel,
  channelTypes,
  initFixtureChannel,
  AxisDir,
  axisDirList,
  DMX_MAX_VALUE,
} from '../../shared/dmxFixtures'
import { colorList, Color } from '../../shared/dmxColors'
import NumberField from '../base/NumberField'
import {
  editFixtureChannel,
  addFixtureChannel,
  removeFixtureChannel,
  addColorMapColor,
  setColorMapColor,
  removeColorMapColor,
} from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import Checkbox from '../base/LabelledCheckbox'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import Popup from 'renderer/base/Popup'

interface Props {
  fixtureID: string
  isInUse: boolean
}

export default function FixtureChannels({ fixtureID, isInUse }: Props) {
  const channelCount = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].channels.length
  )
  const hasMaster = useDmxSelector((state) =>
    state.fixtureTypesByID[fixtureID].channels.find(
      (ch) => ch.type === 'master'
    )
      ? true
      : false
  )
  const [editing, setEditing] = useState<number | null>(null)
  const dispatch = useDispatch()

  const indexes = indexArray(channelCount)

  const addChannelButton = isInUse ? null : (
    <IconButton
      onClick={() =>
        dispatch(
          addFixtureChannel({
            fixtureID: fixtureID,
            newChannel: initFixtureChannel('other'),
          })
        )
      }
    >
      <AddIcon />
    </IconButton>
  )

  return (
    <Root>
      <Header>
        <Title>Channels</Title>
        {addChannelButton}
      </Header>
      <Channels>
        {indexes.map((channelIndex) => (
          <Channel
            key={channelIndex}
            fixtureID={fixtureID}
            channelIndex={channelIndex}
            editing={editing}
            setEditing={setEditing}
            hasMaster={hasMaster}
            isInUse
          />
        ))}
      </Channels>
    </Root>
  )
}

const Root = styled.div``

const Header = styled.div`
  display: flex;
  align-items: center;
`

const Title = styled.span`
  font-size: 1.2rem;
  margin: 0.5rem 0;
`

const Channels = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 0.5rem;
`

interface Props2 {
  fixtureID: string
  channelIndex: number
  hasMaster: boolean
  isInUse: boolean
  editing: number | null
  setEditing: (ch: number | null) => void
}

function Channel(props: Props2) {
  const { fixtureID, channelIndex, editing, setEditing, isInUse } = props
  const ch = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].channels[channelIndex]
  )
  const dispatch = useDispatch()

  const props3 = { ...props, ch: ch }

  return (
    <Root2
      onClick={(e) => {
        if (!e.defaultPrevented) {
          e.preventDefault()
          setEditing(channelIndex)
        }
      }}
    >
      <Ch>{`${channelIndex + 1}`}</Ch>
      <Info>{`${getInfo(props3)}`}</Info>
      <SubInfo>{getSubInfo(props3)}</SubInfo>
      <Sp />
      {!isInUse && (
        <IconButton
          onClick={() =>
            dispatch(
              removeFixtureChannel({
                fixtureID: fixtureID,
                channelIndex: channelIndex,
              })
            )
          }
        >
          <RemoveIcon />
        </IconButton>
      )}
      {editing === channelIndex && (
        <Popup
          title={`Channel ${channelIndex + 1}`}
          onClose={() => {
            setEditing(null)
          }}
        >
          <PopupContent {...props3} />
        </Popup>
      )}
    </Root2>
  )
}

const Root2 = styled.div`
  display: flex;
  align-items: center;
  padding: 0.3rem;
  cursor: pointer;
  :hover {
    background-color: ${(props) => props.theme.colors.bg.lighter};
  }
`

const Ch = styled.div`
  font-size: 1rem;
  margin-right: 0.7rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const SubInfo = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
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

function getInfo({ ch }: Props3): string {
  switch (ch.type) {
    case 'axis':
      return `${ch.dir} Axis`
    case 'color':
      return `${ch.color}`
    case 'colorMap':
      return `Color Map`
    case 'master':
      return `Master`
    case 'other':
      return `Other`
    case 'strobe':
      return `Strobe`
    case 'reset':
      return `Reset`
    case 'mode':
      return `Mode`
  }
}

function getSubInfo({ ch }: Props3): string | null {
  switch (ch.type) {
    case 'axis':
      return `${ch.min} - ${ch.max}`
    case 'colorMap':
      return `${ch.colors.length} colors`
    case 'other':
      return `Default: ${ch.default}`
    case 'strobe':
      return `Solid: ${ch.default_solid} | Strobe: ${ch.default_strobe}`
    case 'master':
      return `${ch.min} - ${ch.max}`
    case 'reset':
      return `val: ${ch.resetVal}`
    case 'mode':
      return `${ch.min} - ${ch.max}`
    default:
      return null
  }
}

function PopupContent(props3: Props3) {
  const { ch, hasMaster, fixtureID, channelIndex } = props3
  const dispatch = useDispatch()

  return (
    <Content>
      <Row>
        <Info>Type:</Info>
        <Select
          label="Channel Type"
          val={ch.type}
          items={
            hasMaster && ch.type !== 'master'
              ? channelTypes.slice(1)
              : channelTypes
          }
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
      <Fields {...props3} />
    </Content>
  )
}

function Fields({ ch, fixtureID, channelIndex }: Props3) {
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
    return (
      <>
        <NumberField
          val={ch.min}
          label="Min"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newMin) =>
            updateChannel({
              ...ch,
              min: newMin,
            })
          }
        />
        <Sp2 />
        <NumberField
          val={ch.max}
          label="Max"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newMax) =>
            updateChannel({
              ...ch,
              max: newMax,
            })
          }
        />
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
    return (
      <NumberField
        val={ch.default}
        label="Default"
        min={0}
        max={DMX_MAX_VALUE}
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
          label="Solid"
          min={0}
          max={DMX_MAX_VALUE}
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
          label="Strobe"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newVal) =>
            updateChannel({
              ...ch,
              default_strobe: newVal,
            })
          }
        />
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
        <Sp2 />
        <NumberField
          val={ch.min}
          label="min"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newVal) =>
            updateChannel({
              ...ch,
              min: newVal,
            })
          }
        />
        <Sp2 />
        <NumberField
          val={ch.max}
          label="max"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newVal) =>
            updateChannel({
              ...ch,
              max: newVal,
            })
          }
        />
      </>
    )
  } else if (ch.type === 'colorMap') {
    return (
      <div>
        <ColorMapColor>
          <ColorMapVisualizer />
          <Info style={{ flex: '1 0 0' }}>DMX Value</Info>
          <Info style={{ flex: '1 0 0' }}>Hue</Info>
        </ColorMapColor>
        {ch.colors.map((color, i) => {
          return (
            <ColorMapColor key={fixtureID + channelIndex + i}>
              <ColorMapVisualizer
                style={{
                  backgroundColor: `hsl(${color.hue * 360}, 100%, 50%)`,
                }}
              />
              <NumberField
                val={color.max}
                label=""
                min={0}
                max={DMX_MAX_VALUE}
                onChange={(newMax) =>
                  dispatch(
                    setColorMapColor({
                      fixtureTypeId: fixtureID,
                      channelIndex,
                      colorIndex: i,
                      newColor: { max: newMax, hue: color.hue },
                    })
                  )
                }
              />
              <Sp2 />
              <NumberField
                val={color.hue}
                label=""
                min={0}
                max={1}
                onChange={(newHue) =>
                  dispatch(
                    setColorMapColor({
                      fixtureTypeId: fixtureID,
                      channelIndex,
                      colorIndex: i,
                      newColor: { max: color.max, hue: newHue },
                    })
                  )
                }
                numberType="float"
              />
            </ColorMapColor>
          )
        })}
        <IconButton
          onClick={() => {
            dispatch(
              removeColorMapColor({
                fixtureTypeId: fixtureID,
                channelIndex,
              })
            )
          }}
        >
          <Remove />
        </IconButton>
        <IconButton
          onClick={() =>
            dispatch(
              addColorMapColor({
                fixtureTypeId: fixtureID,
                channelIndex,
              })
            )
          }
        >
          <Add />
        </IconButton>
      </div>
    )
  } else if (ch.type === 'mode') {
    return (
      <>
        <NumberField
          val={ch.min}
          label="Min"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newMin) =>
            updateChannel({
              ...ch,
              min: newMin,
            })
          }
        />
        <Sp2 />
        <NumberField
          val={ch.max}
          label="Max"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(newMax) =>
            updateChannel({
              ...ch,
              max: newMax,
            })
          }
        />
      </>
    )
  } else if (ch.type === 'reset') {
    return (
      <>
        <NumberField
          val={ch.resetVal}
          label="Reset Value"
          min={0}
          max={DMX_MAX_VALUE}
          onChange={(resetVal) =>
            updateChannel({
              ...ch,
              resetVal,
            })
          }
        />
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

const ColorMapColor = styled.div`
  display: flex;
  align-items: center;
`

const ColorMapVisualizer = styled.div`
  width: 2rem;
  height: 1.5rem;
  margin-right: 0.5rem;
`
