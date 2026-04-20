import IconButton from '@mui/material/IconButton'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'
import {
  setAudioBeatMinIntervalMs,
  setAudioBeatSensitivity,
  setAudioBeatClockEnabled,
  setAudioBpmSmoothing,
  clearAudioBeatTapHint,
  setAudioInputDeviceId,
  setAudioInputEnabled,
  setAudioInputGain,
} from '../redux/controlSlice'
import { useRealtimeSelector } from '../redux/realtimeStore'
import {
  AUDIO_MAX_BEAT_INTERVAL_MS,
  AUDIO_MAX_BPM_SMOOTHING,
  AUDIO_INPUT_DEVICE_DESKTOP,
  AUDIO_MIN_BEAT_INTERVAL_MS,
  AUDIO_MIN_BPM_SMOOTHING,
  normalizeAudioInputSettings,
} from '../../shared/audioEngine'

interface AudioInputDeviceOption {
  deviceId: string
  label: string
}

function levelPercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`
}

function confidenceLabel(value: number) {
  const normalized = Math.min(1, Math.max(0, Number(value) || 0))
  if (normalized >= 0.75) return 'High'
  if (normalized >= 0.45) return 'Medium'
  return 'Low'
}

export default function AudioInputMenu() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [devices, setDevices] = useState<AudioInputDeviceOption[]>([])
  const [loading, setLoading] = useState(false)
  const audioState = useRealtimeSelector((state) => state.audio)
  const settings = useControlSelector((state) =>
    normalizeAudioInputSettings(state.device.connectionSettings.audioInput)
  )
  const midiClockDrivesBpm = useControlSelector(
    (state) => state.device.connectionSettings.midiClockBpmEnabled === true
  )

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setDevices([])
      return
    }

    setLoading(true)
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const microphoneInputs = allDevices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label:
            device.label.trim().length > 0
              ? device.label
              : `Audio Input ${index + 1}`,
        }))
      const nextDevices = [...microphoneInputs]
      nextDevices.push({
        deviceId: AUDIO_INPUT_DEVICE_DESKTOP,
        label: 'Desktop Audio (Loopback)',
      })
      setDevices(nextDevices)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    void refreshDevices()
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) {
      return
    }
    const onDeviceChange = () => {
      void refreshDevices()
    }
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [open, refreshDevices])

  const selectedDeviceId = useMemo(() => {
    if (settings.deviceId.trim().length > 0) {
      return settings.deviceId
    }
    const firstMic = devices.find(
      (device) => device.deviceId !== AUDIO_INPUT_DEVICE_DESKTOP
    )
    return firstMic?.deviceId ?? devices[0]?.deviceId ?? ''
  }, [devices, settings.deviceId])

  return (
    <Root>
      <IconButton
        title="Audio input settings"
        onClick={() => setOpen((previous) => !previous)}
        size="small"
        sx={{
          color: settings.enabled ? 'primary.main' : 'text.secondary',
        }}
      >
        <MusicNoteIcon fontSize="small" />
      </IconButton>
      {open && (
        <Popup title="Audio Input" onClose={() => setOpen(false)}>
          <Field>
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) =>
                  dispatch(setAudioInputEnabled(event.target.checked))
                }
              />{' '}
              Audio Mode
            </label>
          </Field>

          <Field>
            <label
              title={
                midiClockDrivesBpm
                  ? 'MIDI clock tempo is on in Connections — turn that off to use audio beat clock.'
                  : undefined
              }
            >
              <input
                type="checkbox"
                checked={settings.useBeatClock}
                disabled={midiClockDrivesBpm}
                onChange={(event) =>
                  dispatch(setAudioBeatClockEnabled(event.target.checked))
                }
              />{' '}
              Use Audio Beat Clock
            </label>
          </Field>

          {settings.enabled && (
            <Field>
              <Label>BPM tap hint (status bar TAP)</Label>
              <TapHintHelp>
                With Audio Mode on, use the <strong>TAP</strong> button next to the
                tempo readout (same as manual tap tempo). That feeds a short-lived
                hint into beat detection; it is not saved with the project.
              </TapHintHelp>
              {settings.beatTapHintBpm != null && (
                <TapHintRow>
                  <span>Active hint: {settings.beatTapHintBpm} BPM</span>
                  <TapClearLink
                    type="button"
                    onClick={() => dispatch(clearAudioBeatTapHint())}
                  >
                    Clear
                  </TapClearLink>
                </TapHintRow>
              )}
            </Field>
          )}

          <Field>
            <Label>Input Device</Label>
            <Select
              value={selectedDeviceId}
              disabled={loading}
              onChange={(event) =>
                dispatch(setAudioInputDeviceId(event.target.value))
              }
            >
              {devices.length === 0 && (
                <option value="">
                  {loading ? 'Loading audio devices...' : 'No audio inputs'}
                </option>
              )}
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Input Gain ({settings.inputGain.toFixed(2)}x)</Label>
            <input
              type="range"
              min={0}
              max={4}
              step={0.01}
              value={settings.inputGain}
              disabled={settings.enabled !== true}
              onChange={(event) =>
                dispatch(setAudioInputGain(Number(event.target.value) || 0))
              }
            />
          </Field>

          <Field>
            <label>
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(event) => setShowAdvanced(event.target.checked)}
              />{' '}
              Advanced Beat Detection
            </label>
          </Field>

          {showAdvanced && (
            <>
              <Field>
                <Label>
                  Beat Sensitivity ({Math.round(settings.beatSensitivity * 100)}%)
                </Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.beatSensitivity}
                  disabled={settings.enabled !== true}
                  onChange={(event) =>
                    dispatch(
                      setAudioBeatSensitivity(Number(event.target.value) || 0)
                    )
                  }
                />
              </Field>
              <Field>
                <Label>
                  Min Beat Interval ({settings.beatMinIntervalMs} ms)
                </Label>
                <input
                  type="range"
                  min={AUDIO_MIN_BEAT_INTERVAL_MS}
                  max={AUDIO_MAX_BEAT_INTERVAL_MS}
                  step={1}
                  value={settings.beatMinIntervalMs}
                  disabled={settings.enabled !== true}
                  onChange={(event) =>
                    dispatch(
                      setAudioBeatMinIntervalMs(Number(event.target.value) || 0)
                    )
                  }
                />
              </Field>
              <Field>
                <Label>
                  BPM Response ({Math.round(settings.bpmSmoothing * 100)}%)
                </Label>
                <input
                  type="range"
                  min={AUDIO_MIN_BPM_SMOOTHING}
                  max={AUDIO_MAX_BPM_SMOOTHING}
                  step={0.01}
                  value={settings.bpmSmoothing}
                  disabled={settings.enabled !== true}
                  onChange={(event) =>
                    dispatch(setAudioBpmSmoothing(Number(event.target.value) || 0))
                  }
                />
              </Field>
            </>
          )}

          <MeterRow>
            <MeterLabel>Level</MeterLabel>
            <MeterTrack>
              <MeterFill style={{ width: levelPercent(audioState.inputLevel) }} />
            </MeterTrack>
            <MeterValue>{levelPercent(audioState.inputLevel)}</MeterValue>
          </MeterRow>
          <MeterRow>
            <MeterLabel>Energy</MeterLabel>
            <MeterTrack>
              <MeterFill
                style={{
                  width: levelPercent(audioState.energyLevel),
                  background: '#ffd36f',
                }}
              />
            </MeterTrack>
            <MeterValue>{levelPercent(audioState.energyLevel)}</MeterValue>
          </MeterRow>
          {settings.useBeatClock && (
            <MeterRow>
              <MeterLabel>BPM Lock</MeterLabel>
              <MeterTrack>
                <MeterFill
                  style={{
                    width: levelPercent(audioState.detectedBpmConfidence),
                    background:
                      (audioState.detectedBpmConfidence ?? 0) >= 0.75
                        ? '#7dff9d'
                        : (audioState.detectedBpmConfidence ?? 0) >= 0.45
                          ? '#ffd36f'
                          : '#ff8c8c',
                  }}
                />
              </MeterTrack>
              <MeterValue>
                {Math.round(
                  Math.max(0, Math.min(1, audioState.detectedBpmConfidence || 0)) *
                    100
                )}
                % {confidenceLabel(audioState.detectedBpmConfidence)}
              </MeterValue>
            </MeterRow>
          )}
          <BeatText>
            Beat: {audioState.beatPulse > 0.3 ? 'Detected' : 'Idle'} | BPM:{' '}
            {audioState.detectedBpm === null
              ? '--'
              : Math.round(audioState.detectedBpm)}
          </BeatText>
        </Popup>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Field = styled.div`
  margin-bottom: 0.6rem;
  font-size: 0.8rem;
`

const Label = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.2rem;
`

const Select = styled.select`
  width: 100%;
  background: #0009;
  color: #e8eefc;
  border: 1px solid #ffffff33;
  border-radius: 0.25rem;
  padding: 0.25rem 0.35rem;
`

const MeterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
`

const MeterLabel = styled.div`
  width: 3rem;
  font-size: 0.7rem;
  color: #cfd8ee;
`

const MeterTrack = styled.div`
  flex: 1 1 auto;
  height: 0.42rem;
  border: 1px solid #ffffff33;
  border-radius: 999px;
  overflow: hidden;
  background: #0b1020;
`

const MeterFill = styled.div`
  height: 100%;
  background: #6fd8ff;
`

const MeterValue = styled.div`
  width: 5.6rem;
  text-align: right;
  font-size: 0.68rem;
  color: #dce8ff;
`

const BeatText = styled.div`
  margin-top: 0.45rem;
  font-size: 0.7rem;
  color: #c8d4ed;
`

const TapHintHelp = styled.div`
  font-size: 0.7rem;
  line-height: 1.35;
  color: #a8b8d8;
  margin-top: 0.2rem;
`

const TapHintRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: #b8c8e8;
`

const TapClearLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 0.68rem;
  color: #8ab4ff;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    color: #b8d4ff;
  }
`
