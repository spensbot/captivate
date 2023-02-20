import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { DMX_MAX_VALUE } from '../../shared/dmxFixtures'
import NumberField from '../base/NumberField'
import {
  addColorMapColor,
  setColorMapColor,
  removeColorMapColor,
} from '../redux/dmxSlice'
import { IconButton } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import HSpad from 'renderer/base/HSpad'
import { ChannelColorMap } from '../../shared/dmxFixtures'

interface Props {
  ch: ChannelColorMap
  fixtureID: string
  channelIndex: number
}

export default function ColorMapChannel({
  ch,
  fixtureID,
  channelIndex,
}: Props) {
  const dispatch = useDispatch()

  return (
    <div>
      <HSpad hue={0} saturation={0} onChange={() => {}} />
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
            <Sp />
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
}

const ColorMapColor = styled.div`
  display: flex;
  align-items: center;
`

const ColorMapVisualizer = styled.div`
  width: 2rem;
  height: 1.5rem;
  margin-right: 0.5rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const Sp = styled.div`
  width: 1rem;
`
