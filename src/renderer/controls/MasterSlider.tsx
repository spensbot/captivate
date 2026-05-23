import Slider from '../base/Slider'
import { useControlSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setMaster } from '../redux/controlSlice'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import styled from 'styled-components'

export default function MasterSlider() {
  const master = useControlSelector((state) => state.master)
  const dispatch = useDispatch()
  const percent = Math.round(master * 100)

  return (
    <Root title="Master output intensity (MIDI-assignable)">
      <SliderMidiOverlay
        action={{ type: 'setMaster' }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <Card>
          <Label>MASTER</Label>
          <Track>
            <TrackGradient aria-hidden />
            <TrackMask style={{ height: `${100 - percent}%` }} aria-hidden />
            <SliderWrap>
              <Slider
                value={master}
                radius={0.34}
                color={percent >= 85 ? '#f2f2f2' : '#cccccc'}
                onChange={(newVal: number) => {
                  dispatch(setMaster(newVal))
                }}
                orientation="vertical"
              />
            </SliderWrap>
          </Track>
          <Value>{percent}%</Value>
        </Card>
      </SliderMidiOverlay>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`

const Card = styled.div`
  width: 100%;
  height: min(100%, 36rem);
  min-height: 8rem;
  max-height: 36rem;
  border-radius: 0.4rem;
  border: 1px solid #d6ebff66;
  background: linear-gradient(180deg, #1a2433 0%, #0c121c 55%, #070b12 100%);
  box-shadow:
    ${(props) => props.theme.elevation.insetHighlight},
    ${(props) => props.theme.elevation.shadowMd};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  padding: 0.32rem 0.28rem 0.34rem;
  box-sizing: border-box;
`

const Label = styled.div`
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #e8f3ff;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  align-self: center;
`

const Track = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  margin: 0.16rem 0;
  border-radius: 999px;
  border: 1px solid #d3e7ff44;
  background: #050a11;
  overflow: hidden;
`

/** Full-height gradient fixed to the track (bright top → dim bottom); value masks from the top (see TrackMask). */
const TrackGradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, #ffffff 0%, #0b0b0b 100%);
  box-shadow: 0 0 0.5rem #ffffff33;
  pointer-events: none;
`

/** Covers the upper part of the track so only the bottom \`percent\` of the stationary gradient shows. */
const TrackMask = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  background: #050a11;
  pointer-events: none;
`

const SliderWrap = styled.div`
  position: absolute;
  inset: 0.12rem 0.06rem;
  z-index: 1;
`

const Value = styled.div`
  font-size: 0.54rem;
  font-weight: 700;
  color: #f1f1f1;
  text-shadow: 0 0 0.3rem #ffffff44;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  align-self: center;
`
