import SliderBase from '../base/SliderBase'
import { useControlSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setMaster } from '../redux/controlSlice'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import styled from 'styled-components'
import { SIDEBAR_MASTER_FADER_RADIUS_REM } from '../menu/sidebarUi'

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
              <SliderBase
                orientation="vertical"
                radius={SIDEBAR_MASTER_FADER_RADIUS_REM}
                verticalPadRem={0.58}
                trackBackground="transparent"
                onChange={(newVal: number) => {
                  dispatch(setMaster(newVal))
                }}
                title="Master output intensity"
              >
                <WideFaderCap $hot={percent >= 85} $value={master} aria-hidden />
              </SliderBase>
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
  align-items: stretch;
`

const Card = styled.div`
  width: 100%;
  height: min(100%, 36rem);
  min-height: 8rem;
  max-height: 36rem;
  border-radius: 0;
  border-top: 1px solid #d6ebff66;
  border-bottom: 1px solid #d6ebff66;
  background: linear-gradient(180deg, #1a2433 0%, #0c121c 55%, #070b12 100%);
  box-shadow:
    ${(props) => props.theme.elevation.insetHighlight},
    ${(props) => props.theme.elevation.shadowMd};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  padding: 0.34rem 0.12rem 0.36rem;
  box-sizing: border-box;
`

const Label = styled.div`
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #e8f3ff;
  text-align: center;
  user-select: none;
  flex: 0 0 auto;
`

const Track = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  margin: 0.18rem 0;
  border-radius: 0.28rem;
  border: 1px solid #d3e7ff44;
  background: #050a11;
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.55);
`

const TrackGradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, #ffffff 0%, #0b0b0b 100%);
  box-shadow: 0 0 0.5rem #ffffff33;
  pointer-events: none;
`

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
  inset: 0.1rem 0.04rem;
  z-index: 1;
`

const WideFaderCap = styled.div<{ $value: number; $hot: boolean }>`
  position: absolute;
  left: 3%;
  width: 94%;
  height: 1.12rem;
  bottom: ${(p) => p.$value * 100}%;
  transform: translateY(50%);
  border-radius: 0.24rem;
  border: 1px solid ${(p) => (p.$hot ? '#ffffffcc' : '#8a8a8a')};
  background: ${(p) =>
    p.$hot
      ? 'linear-gradient(180deg, #f6f6f6 0%, #c8c8c8 42%, #8e8e8e 100%)'
      : 'linear-gradient(180deg, #ececec 0%, #b4b4b4 45%, #757575 100%)'};
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -2px 0 rgba(0, 0, 0, 0.22);
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    left: 14%;
    right: 14%;
    top: 50%;
    height: 1px;
    transform: translateY(-50%);
    background: repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.28) 0,
      rgba(0, 0, 0, 0.28) 2px,
      transparent 2px,
      transparent 5px
    );
    opacity: 0.55;
  }

  &::after {
    content: '';
    position: absolute;
    left: 10%;
    right: 10%;
    top: 28%;
    bottom: 28%;
    border-radius: 0.12rem;
    border-top: 1px solid rgba(255, 255, 255, 0.35);
    border-bottom: 1px solid rgba(0, 0, 0, 0.18);
    pointer-events: none;
  }
`

const Value = styled.div`
  font-size: 0.56rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f1f1f1;
  text-shadow: 0 0 0.3rem #ffffff44;
  text-align: center;
  user-select: none;
  flex: 0 0 auto;
`
