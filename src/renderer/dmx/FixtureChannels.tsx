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
  DMX_MIN_VALUE,
} from '../../shared/dmxFixtures'
import { colorList, StandardColor } from '../../shared/dmxColors'
import NumberField from '../base/NumberField'
import Input from '../base/Input'
import {
  editFixtureChannel,
  addFixtureChannel,
  removeFixtureChannel,
  addColorMapColor,
  setColorMapColor,
  removeColorMapColor,
  assignChannelToSubFixture,
  removeChannelFromSubFixtures,
} from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import Checkbox from '../base/LabelledCheckbox'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import Popup from 'renderer/base/Popup'
import HSpad from 'renderer/controls/HSpad'

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
            isInUse={isInUse}
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
  const activeSubfixture = useDmxSelector((dmx) => dmx.activeSubFixture)
  const isPartOfActiveSubfixture = useDmxSelector((dmx) => {
    if (dmx.activeFixtureType !== null && dmx.activeSubFixture !== null) {
      return (
        dmx.fixtureTypesByID[dmx.activeFixtureType].subFixtures[
          dmx.activeSubFixture
        ].channels.find((ci) => ci === channelIndex) !== undefined
      )
    } else {
      return false
    }
  })
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
      {activeSubfixture !== null && (
        <Toggle
          enabled={isPartOfActiveSubfixture}
          onClick={(e) => {
            if (!e.defaultPrevented) {
              e.preventDefault()
              if (isPartOfActiveSubfixture) {
                dispatch(removeChannelFromSubFixtures({ channelIndex }))
              } else {
                dispatch(
                  assignChannelToSubFixture({
                    channelIndex,
                    subFixtureIndex: activeSubfixture,
                  })
                )
              }
            }
          }}
        />
      )}
      <Ch>{`${channelIndex + 1}`}</Ch>
      <Info>{`${getInfo(props3)}`}</Info>
      <SubInfo>{getSubInfo(props3)}</SubInfo>
      <Sp />
      {!isInUse && (
        <IconButton
          size="small"
          style={{ margin: '-0.9rem 0' }}
          onClick={(e) => {
            e.preventDefault()
            dispatch(
              removeFixtureChannel({
                fixtureID: fixtureID,
                channelIndex: channelIndex,
              })
            )
          }}
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

const Toggle = styled.div<{ enabled: boolean }>`
  width: 1rem;
  height: 1rem;
  border-radius: 1rem;
  border: 1px solid white;
  background-color: ${(props) => (props.enabled ? 'white' : undefined)};
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
    case 'custom':
      return `${ch.name}`
  }
}

function getSubInfo({ ch }: Props3): string | null {
  switch (ch.type) {
    case 'axis':
      return ch.isFine ? 'fine' : `${ch.min} - ${ch.max}`
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
    const c = ch.color
    const cType =
      c === 'red' || c === 'green' || c === 'blue' || c === 'white'
        ? c
        : 'custom'

    return (
      <>
        <Select
          label="color"
          val={cType}
          items={colorList.concat(['custom'])}
          onChange={(_newColor) => {
            const newColor = _newColor as StandardColor | 'custom'
            if (newColor === 'custom') {
              updateChannel({
                type: 'color',
                color: {
                  hue: 0,
                  saturation: 1,
                },
              })
            } else {
              updateChannel({
                type: 'color',
                color: newColor,
              })
            }
          }}
        />
        {!(c === 'red' || c === 'green' || c === 'blue' || c === 'white') && (
          <HSpad
            hue={c.hue}
            saturation={c.saturation}
            onChange={(newHue, newSaturation) => {
              updateChannel({
                type: 'color',
                color: {
                  hue: newHue,
                  saturation: newSaturation,
                },
              })
            }}
          />
        )}
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
                      newColor: {
                        max: newMax,
                        hue: color.hue,
                        saturation: 1.0,
                      },
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
                      newColor: {
                        max: color.max,
                        hue: newHue,
                        saturation: 1.0,
                      },
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

const ColorMapColor = styled.div`
  display: flex;
  align-items: center;
`

const ColorMapVisualizer = styled.div`
  width: 2rem;
  height: 1.5rem;
  margin-right: 0.5rem;
`
