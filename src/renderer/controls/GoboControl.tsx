import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useBaseParam, useDmxSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { setBaseParams } from '../redux/controlSlice'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import ManualSliderCursor from './ManualSliderCursor'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import { indexArray } from '../../shared/util'
import ParamXButton from './ParamXButton'

interface Props {
  splitIndex: number
}

const sliderRadius = 0.4

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function getDetentIndex(value: number, slotCount: number): number {
  if (slotCount <= 1) return 0
  const normalized = clamp01(value)
  return Math.max(0, Math.min(slotCount - 1, Math.round(normalized * (slotCount - 1))))
}

function snapToDetent(value: number, slotCount: number): number {
  if (slotCount <= 1) return 0
  return getDetentIndex(value, slotCount) / (slotCount - 1)
}

export default function GoboControl({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const { slotCount, labels } = useDmxSelector((dmx) => {
    let maxSlots = 0
    let selectedLabels: string[] = []

    for (const fixtureTypeId of dmx.fixtureTypes) {
      const fixtureType = dmx.fixtureTypesByID[fixtureTypeId]
      for (const channel of fixtureType.channels) {
        if (channel.type !== 'goboMap') continue

        const channelSlotCount = Math.max(1, channel.gobos.length)
        if (channelSlotCount > maxSlots) {
          maxSlots = channelSlotCount
          selectedLabels = channel.gobos.map((gobo, index) => {
            const trimmedName = gobo.name.trim()
            return trimmedName.length > 0 ? trimmedName : `Gobo ${index + 1}`
          })
        }
      }
    }

    return {
      slotCount: maxSlots,
      labels: selectedLabels,
    }
  })

  const baseGobo = useBaseParam('gobo', splitIndex)
  const outputGobo = useRealtimeSelector(
    (state) => state.splitStates[splitIndex]?.outputParams?.gobo
  )

  if (slotCount === 0 || baseGobo === undefined) return null

  const snappedBase = snapToDetent(baseGobo, slotCount)
  const snappedOutput = snapToDetent(outputGobo ?? snappedBase, slotCount)
  const selectedIndex = getDetentIndex(snappedBase, slotCount)
  const selectedLabel = labels[selectedIndex] ?? `Gobo ${selectedIndex + 1}`

  const onChange = (nextValue: number) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          gobo: snapToDetent(nextValue, slotCount),
        },
      })
    )
  }

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '10rem',
    marginRight: '1rem',
    position: 'relative',
    paddingTop: '1.05rem',
    boxSizing: 'border-box',
  }

  const content = (
    <>
      <ParamXButton splitIndex={splitIndex} params={['gobo']} />
      <div style={{ flex: '1 1 auto', minHeight: 0, alignSelf: 'stretch', width: '100%' }}>
        <SliderBase orientation="vertical" radius={sliderRadius} onChange={onChange}>
          <Detents slotCount={slotCount} />
          <SliderCursor
            orientation="vertical"
            value={snappedOutput}
            radius={sliderRadius}
            color="#7befff99"
          />
          <ManualSliderCursor
            orientation="vertical"
            param="gobo"
            splitIndex={splitIndex}
            value={snappedBase}
            radius={sliderRadius}
            color="#fff"
            border
          />
        </SliderBase>
      </div>
      <div style={{ marginTop: '1rem' }}>Gobo</div>
      <SelectedLabel>{selectedLabel}</SelectedLabel>
    </>
  )

  return splitIndex === 0 ? (
    <SliderMidiOverlay
      action={{ type: 'setBaseParam', paramKey: 'gobo' }}
      style={wrapperStyle}
    >
      {content}
    </SliderMidiOverlay>
  ) : (
    <div style={wrapperStyle}>{content}</div>
  )
}

function Detents({ slotCount }: { slotCount: number }) {
  if (slotCount <= 1) return null

  return (
    <>
      {indexArray(slotCount).map((index) => {
        const ratio = slotCount <= 1 ? 0 : index / (slotCount - 1)
        return <Detent key={index} style={{ bottom: `${ratio * 100}%` }} />
      })}
    </>
  )
}

const Detent = styled.div`
  position: absolute;
  left: -0.15rem;
  right: -0.15rem;
  height: 1px;
  background: #ffffff55;
  transform: translateY(0.4rem);
  pointer-events: none;
`

const SelectedLabel = styled.div`
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
  width: 4.8rem;
  text-align: center;
  margin-top: 0.2rem;
  line-height: 1.15;
`
