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
import HSpad, { ColorChannelProps } from 'renderer/base/HSpad'
import { ChannelColorMap } from '../../shared/dmxFixtures'
import { useEffect, useState } from 'react'
import wrapClick from 'renderer/base/wrapClick'
import ColorPicker from 'renderer/base/ColorPicker'
import { getColorPreview, inferColorKind } from '../../shared/dmxColors'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import {
  clearColorMapCalibrationOverride,
  setColorMapCalibrationOverride,
} from '../redux/guiSlice'
import { getColorMapSlotPreviewDmxValue } from '../../shared/fixtureMapCalibration'

interface Props {
  ch: ChannelColorMap
  fixtureID: string
  channelIndex: number
  /** When set (e.g. color map inside a split range), edits flow through this instead of Redux. */
  onChange?: (newChannel: ChannelColorMap) => void
}

export default function ColorMapChannel({
  ch,
  fixtureID,
  channelIndex,
  onChange,
}: Props) {
  const dispatch = useDispatch()
  const [activeColorIndex, setActiveColorIndex] = useState(0)
  const controlled = onChange !== undefined

  const hasAssignedFixture = useDmxSelector((dmx) =>
    dmx.universe.some((fixture) => fixture.type === fixtureID)
  )
  const currentOverride = useTypedSelector(
    (state) => state.gui.colorMapCalibrationOverride
  )

  function replaceColors(nextColors: ChannelColorMap['colors']) {
    onChange?.({
      ...ch,
      colors: nextColors,
    })
  }

  function updateColorAt(colorIndex: number, newColor: ChannelColorMap['colors'][number]) {
    setActiveColorIndex(colorIndex)
    if (controlled) {
      replaceColors(
        ch.colors.map((color, index) =>
          index === colorIndex ? newColor : color
        )
      )
      return
    }
    dispatch(
      setColorMapColor({
        fixtureTypeId: fixtureID,
        channelIndex,
        colorIndex,
        newColor,
      })
    )
  }

  useEffect(() => {
    if (activeColorIndex < ch.colors.length) return
    setActiveColorIndex(Math.max(0, ch.colors.length - 1))
  }, [activeColorIndex, ch.colors.length])

  useEffect(() => {
    if (!hasAssignedFixture || ch.colors.length === 0) {
      if (currentOverride !== null) {
        dispatch(clearColorMapCalibrationOverride())
      }
      return
    }

    const clampedColorIndex = Math.max(
      0,
      Math.min(activeColorIndex, ch.colors.length - 1)
    )
    const dmxValue = getColorMapSlotPreviewDmxValue(ch.colors, clampedColorIndex)

    if (
      currentOverride?.fixtureTypeId === fixtureID &&
      currentOverride.channelIndex === channelIndex &&
      currentOverride.dmxValue === dmxValue
    ) {
      return
    }

    dispatch(
      setColorMapCalibrationOverride({
        fixtureTypeId: fixtureID,
        channelIndex,
        dmxValue,
      })
    )
  }, [
    dispatch,
    hasAssignedFixture,
    ch.colors,
    activeColorIndex,
    fixtureID,
    channelIndex,
    currentOverride,
  ])

  useEffect(() => {
    return () => {
      dispatch(clearColorMapCalibrationOverride())
    }
  }, [dispatch])

  const safeColorIndex = Math.max(0, Math.min(activeColorIndex, ch.colors.length - 1))
  const activeColor = ch.colors[safeColorIndex] ?? {
    max: 0,
    hue: 0,
    saturation: 1,
    kind: 'color' as const,
  }

  const colorProps: ColorChannelProps = {
    hue: activeColor.hue,
    saturation: activeColor.saturation,
    onChange: (newHue, newSaturation) => {
      updateColorAt(safeColorIndex, {
        max: activeColor.max,
        hue: newHue,
        saturation: newSaturation,
        kind: inferColorKind({ hue: newHue, saturation: newSaturation }),
      })
    },
  }

  return (
    <div>
      <ColorPicker
        color={activeColor}
        onChange={(newColor) =>
          updateColorAt(safeColorIndex, {
            max: activeColor.max,
            hue: newColor.hue,
            saturation: newColor.saturation,
            kind: newColor.kind,
          })
        }
      />
      <div style={{ height: '0.5rem' }} />
      <HSpad {...colorProps} />
      <Sp />
      <ColorMapColor>
        <ColorMapVisualizer isActive={false} />
        <Info style={{ flex: '1 0 0' }}>DMX Value</Info>
      </ColorMapColor>
      {ch.colors.map((color, i) => {
        const isActive = safeColorIndex === i
        return (
          <ColorMapColor key={fixtureID + channelIndex + i}>
            <ColorMapVisualizer
              onClick={wrapClick(() => setActiveColorIndex(i))}
              style={{
                backgroundColor: getColorPreview(color),
              }}
              isActive={isActive}
            />
            <NumberField
              val={color.max}
              label=""
              min={0}
              max={DMX_MAX_VALUE}
              onFocus={() => setActiveColorIndex(i)}
              onChange={(newMax) =>
                updateColorAt(i, {
                  max: newMax,
                  hue: color.hue,
                  saturation: color.saturation,
                  kind: color.kind,
                })
              }
            />
          </ColorMapColor>
        )
      })}
      <IconButton
        title="Add color map entry"
        onClick={() => {
          const lastColorMax = ch.colors[ch.colors.length - 1]?.max
          if (controlled) {
            replaceColors(
              ch.colors.concat({
                max: lastColorMax ?? 0,
                hue: 0,
                saturation: 1,
                kind: 'color',
              })
            )
            return
          }
          dispatch(
            addColorMapColor({
              fixtureTypeId: fixtureID,
              channelIndex,
            })
          )
        }}
      >
        <Add />
      </IconButton>
      {ch.colors.length > 1 && (
        <IconButton
          title="Remove last color map entry"
          onClick={() => {
            if (safeColorIndex === ch.colors.length - 1) {
              setActiveColorIndex(safeColorIndex - 1)
            }
            if (controlled) {
              replaceColors(ch.colors.slice(0, -1))
              return
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
