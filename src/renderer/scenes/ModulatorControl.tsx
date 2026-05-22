import { useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import LfoMenu from './LfoMenu'
import LfoVisualizer from './LfoVisualizer'
import LfoCursor from './LfoCursor'
import LfoStoredCursor from './LfoStoredCursor'
import LfoShapeParamSlider from './LfoShapeParamSlider'
import ModulationMatrix from './ModulationMatrix'
import { useActiveLightScene } from '../redux/store'
import { LfoShape } from '../../shared/oscillator'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { setModulatorAudioConfig, setModulatorWaveConfig } from '../redux/controlSlice'
import {
  intermodIncomingSources,
  intermodOutgoingTargets,
  intermodSourceAccentColor,
} from '../../shared/modulation'
import { useModPreviewSplit } from './useModPreviewSplit'

import { getAudioBandCutoffSliderBounds } from '../../shared/audioEngine'
import { AUDIO_BAND_MAX_LEVEL_UI } from '../../shared/lfoShapeSlider'

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
  const [modMatrixOpen, setModMatrixOpen] = useState(true)
  const lfo = useActiveLightScene((activeScene) => activeScene.modulators[index].lfo)
  const audioMetrics = useRealtimeSelector((state) => state.audio)
  const splitIx = useModPreviewSplit()
  const intermodAccents = useActiveLightScene((scene) => ({
    outgoingTargets: intermodOutgoingTargets(scene, index),
    incomingSources: intermodIncomingSources(scene, index),
  }))

  const { lowCutMinHz, lowCutMaxHz, highCutMinHz, highCutMaxHz } =
    getAudioBandCutoffSliderBounds(audioMetrics.nyquistHz)

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
      {intermodAccents.outgoingTargets.length > 0 ? (
        <IntermodAccentRail $side="left">
          <IntermodAccentStripe
            $color={intermodSourceAccentColor(index)}
            title={
              intermodAccents.outgoingTargets.length === 1
                ? `This LFO modulates LFO ${intermodAccents.outgoingTargets[0]! + 1} (same color on that LFO’s right edge)`
                : `This LFO modulates LFOs ${intermodAccents.outgoingTargets.map((i) => i + 1).join(', ')} (same color on each target’s right edge for this source)`
            }
          />
        </IntermodAccentRail>
      ) : null}
      {intermodAccents.incomingSources.length > 0 ? (
        <IntermodAccentRail $side="right">
          {intermodAccents.incomingSources.map((srcIdx) => (
            <IntermodAccentStripe
              key={`im-in-${srcIdx}-to-${index}`}
              $color={intermodSourceAccentColor(srcIdx)}
              title={`LFO ${srcIdx + 1} modulates this LFO (same color on that LFO’s left edge)`}
            />
          ))}
        </IntermodAccentRail>
      ) : null}
      <LfoMenu index={index} />
      <TopRow>
        <GraphArea>
          <LfoVisualizer
            width={200}
            height={150}
            padding={0.05}
            index={index}
          />
          <LfoStoredCursor index={index} padding={0.05} />
          <LfoCursor index={index} padding={0.05} />
        </GraphArea>

        {hasShapeSliders ? (
          <>
            <SideRail
              type="button"
              aria-expanded={shapeSlidersOpen}
              aria-label={
                shapeSlidersOpen
                  ? 'Hide LFO shape controls'
                  : 'Show LFO shape controls'
              }
              title={shapeSlidersOpen ? 'Hide shape sliders' : 'Show shape sliders'}
              onClick={() => setShapeSlidersOpen((open) => !open)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {shapeSlidersOpen ? (
                <ChevronLeft sx={{ fontSize: '0.62rem', display: 'block' }} />
              ) : (
                <ChevronRight sx={{ fontSize: '0.62rem', display: 'block' }} />
              )}
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
                        <LfoShapeParamSlider
                          modIndex={index}
                          splitIndex={splitIx}
                          centerDetent={spec.centerDetent === true}
                          spec={spec}
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
      <MatrixSection>
        <MatrixCollapseBar
          type="button"
          aria-expanded={modMatrixOpen}
          aria-label={
            modMatrixOpen
              ? 'Collapse LFO modulation list'
              : 'Expand LFO modulation list'
          }
          title={modMatrixOpen ? 'Hide modulation targets' : 'Show modulation targets'}
          onClick={() => setModMatrixOpen((open) => !open)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {modMatrixOpen ? (
            <ExpandLess sx={{ fontSize: '0.58rem', display: 'block' }} />
          ) : (
            <ExpandMore sx={{ fontSize: '0.58rem', display: 'block' }} />
          )}
        </MatrixCollapseBar>
        {modMatrixOpen ? (
          <MatrixBody>
            <ModulationMatrix index={index} />
          </MatrixBody>
        ) : null}
      </MatrixSection>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
  flex: 0 0 auto;
`

const INTERMOD_STRIPE_PX = 3

const IntermodAccentRail = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${(p) => (p.$side === 'left' ? `left: 0;` : `right: 0;`)}
  display: flex;
  flex-direction: ${(p) => (p.$side === 'left' ? 'row' : 'row-reverse')};
  pointer-events: none;
  z-index: 4;
`

const IntermodAccentStripe = styled.div<{ $color: string }>`
  width: ${INTERMOD_STRIPE_PX}px;
  flex: 0 0 ${INTERMOD_STRIPE_PX}px;
  align-self: stretch;
  background: ${(p) => p.$color};
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.42);
  pointer-events: auto;
  cursor: help;
`

const MatrixSection = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const MatrixCollapseBar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0.055rem 0.17rem 0.08rem;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  background: linear-gradient(to bottom, rgba(22, 26, 34, 0.72), rgba(8, 10, 14, 0.88));
  color: #b8c4d9;
  cursor: pointer;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  min-height: 0;
  line-height: 1;

  &:hover {
    color: #fff;
    background: linear-gradient(
      to bottom,
      rgba(32, 38, 48, 0.88),
      rgba(14, 16, 22, 0.94)
    );
  }

  &:focus-visible {
    outline: 2px solid rgba(142, 178, 255, 0.85);
    outline-offset: -1px;
  }
`

const MatrixBody = styled.div`
  width: 100%;
  min-width: 0;
  padding: 0 0.3rem 0.28rem;
  box-sizing: border-box;
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

const SideRail = styled.button`
  flex: 0 0 auto;
  width: 0.92rem;
  min-width: 0.92rem;
  height: 150px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.26rem;
  background: linear-gradient(to bottom, rgba(22, 26, 34, 0.92), rgba(8, 10, 14, 0.96));
  color: #b8c4d9;
  cursor: pointer;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;

  &:hover {
    color: #fff;
    background: linear-gradient(
      to bottom,
      rgba(32, 38, 48, 0.96),
      rgba(14, 16, 22, 0.98)
    );
  }

  &:focus-visible {
    outline: 2px solid rgba(142, 178, 255, 0.85);
    outline-offset: 2px;
  }
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

const ControlHint = styled.div`
  margin-top: 0.28rem;
  text-align: center;
  font-size: 0.64rem;
  color: #c5cedf;
`
