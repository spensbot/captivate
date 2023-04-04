import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { DMX_MAX_VALUE } from '../shared/dmxFixtures'
import NumberField from '../../ui/react/base/NumberField'
import {
  addColorMapColor,
  setColorMapColor,
  removeColorMapColor,
} from '../../fixtures/redux/fixturesSlice'
import { IconButton } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import HSpad, { ColorChannelProps } from 'features/ui/react/base/HSpad'
import { ChannelColorMap } from '../shared/dmxFixtures'
import { useState } from 'react'
import wrapClick from 'features/ui/react/base/wrapClick'
import { lerp } from 'features/utils/math/util'
import ColorPicker from 'features/ui/react/base/ColorPicker'

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
  const [activeColorIndex, setActiveColorIndex] = useState(0)

  let activeColor = ch.colors[activeColorIndex]

  const colorProps: ColorChannelProps = {
    hue: activeColor.hue,
    saturation: activeColor.saturation,
    onChange: (newHue, newSaturation) => {
      dispatch(
        setColorMapColor({
          fixtureTypeId: fixtureID,
          channelIndex,
          colorIndex: activeColorIndex,
          newColor: {
            max: activeColor.max,
            hue: newHue,
            saturation: newSaturation,
          },
        })
      )
    },
  }

  return (
    <div>
      <ColorPicker {...colorProps} />
      <div style={{ height: '0.5rem' }} />
      <HSpad {...colorProps} />
      <Sp />
      <ColorMapColor>
        <ColorMapVisualizer isActive={false} />
        <Info style={{ flex: '1 0 0' }}>DMX Value</Info>
      </ColorMapColor>
      {ch.colors.map((color, i) => {
        const isActive = activeColorIndex === i
        return (
          <ColorMapColor key={fixtureID + channelIndex + i}>
            <ColorMapVisualizer
              onClick={wrapClick(() => setActiveColorIndex(i))}
              style={{
                backgroundColor: `hsl(${color.hue * 360}, ${
                  color.saturation * 100
                }%, ${lerp(100, 50, color.saturation)}%)`,
              }}
              isActive={isActive}
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
          </ColorMapColor>
        )
      })}
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
      {ch.colors.length > 1 && (
        <IconButton
          onClick={() => {
            if (activeColorIndex === ch.colors.length - 1) {
              setActiveColorIndex(activeColorIndex - 1)
            }
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
      )}
    </div>
  )
}

const ColorMapColor = styled.div`
  display: flex;
  align-items: center;
`

const ColorMapVisualizer = styled.div<{ isActive: boolean }>`
  width: 2rem;
  height: 1.5rem;
  margin-right: 0.5rem;
  border: ${(props) => props.isActive && '1.5px solid white'};
  box-sizing: border-box;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const Sp = styled.div`
  width: 1rem;
  height: 1rem;
`
