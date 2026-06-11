import Slider from '../base/Slider'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useControlSelector, useDeviceSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'
import {
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  setAutoSceneMatchAudioEnergy,
  setAutoSceneEnergyMatchEnabled,
} from '../redux/controlSlice'
import { SceneType } from '../../shared/Scenes'
import DraggableNumber from '../base/DraggableNumber'
import { ButtonMidiOverlay, SliderMidiOverlay } from 'renderer/base/MidiOverlay'
import { normalizeAudioInputSettings } from '../../shared/audioEngine'
import { AutoSceneHelpButton, EnergyMatchHelpButton } from './sceneHelpButtons'

export default function AutoScene({ sceneType }: { sceneType: SceneType }) {
  const dispatch = useDispatch()
  const { enabled, epicness, period, energyMatchEnabled, matchAudioEnergy } =
    useControlSelector((control) => control[sceneType].auto)
  const audioSettings = useDeviceSelector((device) =>
    normalizeAudioInputSettings(device.connectionSettings.audioInput)
  )
  const audioMetrics = useRealtimeSelector((state) => state.audio)
  const audioInputOn = audioSettings.enabled === true

  const autoOn = enabled === true
  const showEnergyMode = autoOn && sceneType === 'light'
  const showEnergyPicker = showEnergyMode && energyMatchEnabled === true
  const showAudioMatchOption = showEnergyPicker && audioInputOn
  const showLiveEnergyMeter = showAudioMatchOption && matchAudioEnergy === true

  const liveEnergy = Math.min(
    1,
    Math.max(0, Number(audioMetrics.energyLevel) || 0)
  )

  const onBombacityChange = (newVal: number) => {
    dispatch(
      setAutoSceneBombacity({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  const onPeriodChange = (newVal: number) => {
    dispatch(
      setAutoScenePeriod({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  return (
    <Root>
      <AutoSceneHelpButton />
      <ButtonMidiOverlay
        action={{
          type: 'toggleAutoScene',
          sceneType: sceneType,
        }}
      >
        <Button
          title="Turn on to change scenes automatically on the beat"
          style={{
            backgroundColor: enabled ? '#3d5a' : '#fff3',
            color: enabled ? '#eee' : '#fff9',
          }}
          onClick={() =>
            dispatch(
              setAutoSceneEnabled({
                sceneType: sceneType,
                val: !enabled,
              })
            )
          }
        >
          auto
        </Button>
      </ButtonMidiOverlay>
      <DraggableNumber
        value={period}
        min={1}
        max={64}
        onChange={onPeriodChange}
        title="Beats to wait before switching to the next scene"
        style={{
          backgroundColor: '#0005',
          color: enabled ? '#fff' : '#fff5',
        }}
      />
      {showEnergyMode && (
        <>
          <EnergyModeToggle
            type="button"
            title={
              energyMatchEnabled
                ? 'Pick the scene closest in energy (by color bar)'
                : 'Pick a random scene each time'
            }
            $active={energyMatchEnabled}
            onClick={() =>
              dispatch(
                setAutoSceneEnergyMatchEnabled({
                  sceneType,
                  val: !energyMatchEnabled,
                })
              )
            }
          >
            energy
          </EnergyModeToggle>
          <EnergyMatchHelpButton />
        </>
      )}
      {showAudioMatchOption && (
        <AudioMatchToggle
          type="button"
          title={
            matchAudioEnergy
              ? 'Use how loud the music is to pick scenes'
              : 'Use the energy slider instead of the music'
          }
          $active={matchAudioEnergy}
          onClick={() =>
            dispatch(
              setAutoSceneMatchAudioEnergy({
                sceneType,
                val: !matchAudioEnergy,
              })
            )
          }
        >
          audio
        </AudioMatchToggle>
      )}
      {showEnergyPicker &&
        (showLiveEnergyMeter ? (
          <EnergyMeterHost title="Loudness of your music right now — used to pick scenes">
            <EnergyMeterTrack>
              <EnergyMeterFill $level={liveEnergy} />
            </EnergyMeterTrack>
            <EnergyMeterValue>{Math.round(liveEnergy * 100)}%</EnergyMeterValue>
          </EnergyMeterHost>
        ) : (
          <SliderMidiOverlay
            action={{ type: 'setAutoSceneBombacity' }}
            style={{ flex: '1 0 auto', marginLeft: '0.15rem', padding: '0.5rem' }}
          >
            <Slider
              value={epicness}
              radius={enabled ? 0.5 : 0.4}
              orientation="horizontal"
              onChange={onBombacityChange}
              color={enabled ? '#3d5e' : undefined}
              title="Calm (left) to intense (right) — picks the closest scene color"
            />
          </SliderMidiOverlay>
        ))}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.35rem;
  min-width: 0;
`

const Button = styled.div`
  border-radius: 0.3rem;
  padding: 0.1rem 0.3rem;
  cursor: pointer;
  font-size: 0.9rem;
  flex-shrink: 0;
`

const EnergyModeToggle = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  border-radius: 0.3rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.72rem;
  cursor: pointer;
  border: 1px solid
    ${(p) => (p.$active ? '#7dff9d' : p.theme.colors.divider)};
  background: ${(p) => (p.$active ? '#7dff9d22' : '#0005')};
  color: ${(p) => (p.$active ? '#b8ffc8' : p.theme.colors.text.secondary)};
  white-space: nowrap;
`

const AudioMatchToggle = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  border-radius: 0.3rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.72rem;
  cursor: pointer;
  border: 1px solid
    ${(p) => (p.$active ? '#ffd36f' : p.theme.colors.divider)};
  background: ${(p) => (p.$active ? '#ffd36f33' : '#0005')};
  color: ${(p) => (p.$active ? '#ffe9a8' : p.theme.colors.text.secondary)};
  white-space: nowrap;
`

const EnergyMeterHost = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0.15rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.5rem;
`

const EnergyMeterTrack = styled.div`
  flex: 1 1 auto;
  height: 0.45rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 999px;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg.primary};
`

const EnergyMeterFill = styled.div<{ $level: number }>`
  height: 100%;
  width: ${(p) => `${Math.round(Math.min(1, Math.max(0, p.$level)) * 100)}%`};
  background: #ffd36f;
  transition: width 80ms linear;
`

const EnergyMeterValue = styled.div`
  flex-shrink: 0;
  font-size: 0.68rem;
  color: ${(p) => p.theme.colors.text.secondary};
  width: 2.5rem;
  text-align: right;
`
