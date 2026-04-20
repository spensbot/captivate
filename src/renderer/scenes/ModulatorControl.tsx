import { useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import IconButton from '@mui/material/IconButton'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import LfoMenu from './LfoMenu'
import LfoVisualizer from './LfoVisualizer'
import LfoCursor from './LfoCursor'
import ModulationMatrix from './ModulationMatrix'
import { useActiveLightScene } from '../redux/store'
import { LfoShape } from '../../shared/oscillator'
import { useRealtimeSelector } from '../redux/realtimeStore'
import {
  AUDIO_MAX_BAND_HZ,
  AUDIO_MIN_BAND_HZ,
} from '../../shared/audioEngine'
import { setModulatorAudioConfig, setModulatorWaveConfig } from '../redux/controlSlice'

const AUDIO_BAND_MAX_LEVEL_UI = 0.65

type Props = {
  index: number
}

type SliderSpec = {
  id: string
  label: string
  title: string
  min: number
  max: number
  step: number
  value: number
  centerDetent?: boolean
  onChange: (value: number) => void
}

export default function ModulatorControl({ index }: Props) {
  const dispatch = useDispatch()
  const [shapeSlidersOpen, setShapeSlidersOpen] = useState(true)
  const lfo = useActiveLightScene((activeScene) => activeScene.modulators[index].lfo)
  const audioMetrics = useRealtimeSelector((state) => state.audio)

  const nyquistCapHz = Math.max(
    AUDIO_MIN_BAND_HZ + 40,
    Math.min(
      AUDIO_MAX_BAND_HZ,
      Number.isFinite(audioMetrics.nyquistHz)
        ? Math.round(audioMetrics.nyquistHz)
        : AUDIO_MAX_BAND_HZ
    )
  )
  const lowCutMinHz = AUDIO_MIN_BAND_HZ
  const lowCutMaxHz = Math.max(
    lowCutMinHz + 20,
    Math.min(12000, nyquistCapHz - 20)
  )
  const highCutMinHz = Math.max(40, AUDIO_MIN_BAND_HZ + 20)
  const highCutMaxHz = nyquistCapHz

  function withCenterDetent(value: number) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0))
    return Math.abs(clamped - 0.5) <= 0.03 ? 0.5 : clamped
  }

  const sliderSpecs: SliderSpec[] = []
  if (lfo.shape === LfoShape.AudioBand) {
    sliderSpecs.push(
      {
        id: 'low',
        label: 'Low Cutoff',
        title: 'Audio band low cutoff (Hz)',
        min: lowCutMinHz,
        max: lowCutMaxHz,
        step: 1,
        value: lfo.audioBandLowHz,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioBandLowHz: value,
            })
          ),
      },
      {
        id: 'high',
        label: 'High Cutoff',
        title: 'Audio band high cutoff (Hz)',
        min: highCutMinHz,
        max: highCutMaxHz,
        step: 1,
        value: lfo.audioBandHighHz,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioBandHighHz: value,
            })
          ),
      },
      {
        id: 'attack',
        label: 'Attack',
        title: 'Audio band attack response',
        min: 0,
        max: 1,
        step: 0.01,
        value: lfo.audioAttack,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioAttack: value,
            })
          ),
      },
      {
        id: 'decay',
        label: 'Decay',
        title: 'Audio band decay response',
        min: 0,
        max: 1,
        step: 0.01,
        value: lfo.audioDecay,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioDecay: value,
            })
          ),
      },
      {
        id: 'bandSmoothing',
        label: 'Smoothing',
        title: 'Extra smoothing after attack/decay (audio band)',
        min: 0,
        max: 1,
        step: 0.01,
        value: lfo.audioBandSmoothing ?? 0,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioBandSmoothing: value,
            })
          ),
      },
      {
        id: 'threshold',
        label: 'Threshold',
        title: 'Audio threshold (below this maps to zero)',
        min: 0,
        max: 0.99,
        step: 0.01,
        value: lfo.audioThreshold,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioThreshold: value,
            })
          ),
      },
      {
        id: 'max',
        label: 'Max Level',
        title: 'Audio max level (maps to full-scale output)',
        min: 0.01,
        max: AUDIO_BAND_MAX_LEVEL_UI,
        step: 0.01,
        value: Math.min(lfo.audioMax, AUDIO_BAND_MAX_LEVEL_UI),
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioMax: Math.min(AUDIO_BAND_MAX_LEVEL_UI, value),
            })
          ),
      }
    )
  } else if (lfo.shape === LfoShape.AudioEnergy) {
    sliderSpecs.push(
      {
        id: 'threshold',
        label: 'Threshold',
        title: 'Energy threshold (below this maps to zero)',
        min: 0,
        max: 0.99,
        step: 0.01,
        value: lfo.audioThreshold,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioThreshold: value,
            })
          ),
      },
      {
        id: 'max',
        label: 'Max Level',
        title: 'Energy max level (maps to full-scale output)',
        min: 0.01,
        max: 1,
        step: 0.01,
        value: lfo.audioMax,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioMax: value,
            })
          ),
      },
      {
        id: 'smoothing',
        label: 'Smoothing',
        title: 'Audio energy smoothing amount',
        min: 0,
        max: 1,
        step: 0.01,
        value: lfo.audioEnergySmoothing,
        onChange: (value) =>
          dispatch(
            setModulatorAudioConfig({
              index,
              audioEnergySmoothing: value,
            })
          ),
      }
    )
  } else if (lfo.shape === LfoShape.Sin) {
    sliderSpecs.push({
      id: 'sinePeakWidth',
      label: 'Peak Width',
      title: 'Adjusts how wide or narrow sine peaks are',
      min: 0,
      max: 1,
      step: 0.01,
      value: lfo.sinePeakWidth,
      centerDetent: true,
      onChange: (value) =>
        dispatch(
          setModulatorWaveConfig({
            index,
            sinePeakWidth: withCenterDetent(value),
          })
        ),
    })
  } else if (lfo.shape === LfoShape.Ramp) {
    sliderSpecs.push({
      id: 'rampCurve',
      label: 'Curve',
      title: 'Center is linear; move lower/higher for reverse/forward curve',
      min: 0,
      max: 1,
      step: 0.01,
      value: lfo.rampCurve,
      centerDetent: true,
      onChange: (value) =>
        dispatch(
          setModulatorWaveConfig({
            index,
            rampCurve: withCenterDetent(value),
          })
        ),
    })
  } else if (lfo.shape === LfoShape.Square) {
    sliderSpecs.push({
      id: 'squareDuty',
      label: 'Pulse Width',
      title: 'Pulse width (duty cycle) from 50/50 toward either side',
      min: 0,
      max: 1,
      step: 0.01,
      value: lfo.squareDuty,
      centerDetent: true,
      onChange: (value) =>
        dispatch(
          setModulatorWaveConfig({
            index,
            squareDuty: withCenterDetent(value),
          })
        ),
    })
  } else if (lfo.shape === LfoShape.Saw) {
    sliderSpecs.push({
      id: 'sawFlatten',
      label: 'Flatten',
      title: 'Flattens triangle peaks toward a flat line',
      min: 0,
      max: 1,
      step: 0.01,
      value: lfo.sawFlatten,
      onChange: (value) =>
        dispatch(
          setModulatorWaveConfig({
            index,
            sawFlatten: value,
          })
        ),
    })
  } else if (lfo.shape === LfoShape.Noise) {
    sliderSpecs.push({
      id: 'noiseSeed',
      label: 'Noise Seed',
      title: 'Changes the pseudo-random noise seed/pattern',
      min: 0,
      max: 1,
      step: 0.01,
      value: lfo.noiseSeed,
      centerDetent: true,
      onChange: (value) =>
        dispatch(
          setModulatorWaveConfig({
            index,
            noiseSeed: withCenterDetent(value),
          })
        ),
    })
  }

  const hasShapeSliders = sliderSpecs.length > 0

  return (
    <Root>
      <LfoMenu index={index} />
      <TopRow>
        <GraphArea>
          <LfoVisualizer
            width={200}
            height={150}
            padding={0.05}
            index={index}
          />
          <LfoCursor index={index} padding={0.05} />
        </GraphArea>

        {hasShapeSliders ? (
          <>
            <SideRail>
              <IconButton
                size="small"
                aria-expanded={shapeSlidersOpen}
                aria-label={
                  shapeSlidersOpen
                    ? 'Hide LFO shape controls'
                    : 'Show LFO shape controls'
                }
                title={shapeSlidersOpen ? 'Hide shape sliders' : 'Show shape sliders'}
                onClick={() => setShapeSlidersOpen((open) => !open)}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  minWidth: 0,
                  width: '0.95rem',
                  padding: '0.04rem',
                  color: '#b8c4d9',
                  borderRadius: '0.16rem',
                  '&:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                {shapeSlidersOpen ? (
                  <ChevronLeft sx={{ fontSize: '0.95rem' }} />
                ) : (
                  <ChevronRight sx={{ fontSize: '0.95rem' }} />
                )}
              </IconButton>
            </SideRail>
            {shapeSlidersOpen ? (
              <ControlPanel
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <ControlRack>
                  {sliderSpecs.map((spec) => (
                    <VerticalControl key={spec.id}>
                      <VerticalLabel title={spec.title}>{spec.label}</VerticalLabel>
                      <VerticalSliderShell $centerDetent={spec.centerDetent === true}>
                        <VerticalSlider
                          type="range"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={spec.value}
                          title={spec.title}
                          onChange={(event) =>
                            spec.onChange(Number(event.target.value) || 0)
                          }
                        />
                      </VerticalSliderShell>
                    </VerticalControl>
                  ))}
                </ControlRack>
              </ControlPanel>
            ) : null}
          </>
        ) : (
          <ControlPanel>
            <ControlRack />
            <ControlHint>No shape controls</ControlHint>
          </ControlPanel>
        )}
      </TopRow>
      <ModulationMatrix index={index} />
    </Root>
  )
}

const Root = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
  flex: 0 0 auto;
`

const TopRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  padding: 0.28rem 0.3rem 0.22rem;
  overflow: hidden;
`

const GraphArea = styled.div`
  position: relative;
  width: 200px;
  min-width: 200px;
  height: 150px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const SideRail = styled.div`
  flex: 0 0 auto;
  width: 1.1rem;
  min-width: 1.1rem;
  height: 150px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.26rem;
  background: linear-gradient(to bottom, rgba(22, 26, 34, 0.92), rgba(8, 10, 14, 0.96));
`

const ControlPanel = styled.div`
  width: fit-content;
  min-width: 0;
  max-width: none;
  flex: 0 0 auto;
  height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.28rem;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.76), rgba(0, 0, 0, 0.9));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.1rem 0.22rem;
`

const ControlRack = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.28rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const VerticalControl = styled.div`
  width: 1.7rem;
  min-width: 1.7rem;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.18rem;
`

const VerticalLabel = styled.div`
  align-self: center;
  flex-shrink: 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-orientation: mixed;
  font-size: 0.56rem;
  font-weight: 700;
  color: #d7dff0;
  letter-spacing: 0.01rem;
  user-select: none;
  line-height: 1;
`

const VerticalSliderShell = styled.div<{ $centerDetent: boolean }>`
  position: relative;
  width: 0.92rem;
  min-height: 0;
  flex: 1 1 auto;
  align-self: stretch;
  height: 100%;
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    display: ${(props) => (props.$centerDetent ? 'block' : 'none')};
    position: absolute;
    left: 0.08rem;
    right: 0.08rem;
    top: 50%;
    height: 1px;
    background: rgba(255, 216, 150, 0.9);
    pointer-events: none;
  }
`

const VerticalSlider = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: max(4.5rem, 100cqh);
  height: 0.92rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  transform: rotate(-90deg);
  transform-origin: center center;
  outline: none;

  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 0.24rem;
    border-radius: 999px;
    background: linear-gradient(to top, #5a5a5a, #9e9e9e);
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.56rem;
    height: 0.56rem;
    margin-top: calc((0.24rem - 0.56rem) / 2);
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.55);
    background: #ffd896;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
  }

  &::-moz-range-track {
    width: 100%;
    height: 0.24rem;
    border: none;
    border-radius: 999px;
    background: linear-gradient(to top, #5a5a5a, #9e9e9e);
  }

  &::-moz-range-thumb {
    width: 0.56rem;
    height: 0.56rem;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.55);
    background: #ffd896;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
  }

  &::-moz-range-progress {
    height: 0.24rem;
    border-radius: 999px;
    background: #8fb0ff;
  }
`

const ControlHint = styled.div`
  margin-top: 0.28rem;
  text-align: center;
  font-size: 0.64rem;
  color: #c5cedf;
`
