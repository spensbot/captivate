import type { ReactNode } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Popup from '../base/Popup'
import ToggleSwitch from '../base/ToggleSwitch'
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
import { APP_TOOLTIP_SLOT_PROPS } from '../base/appTooltip'

interface AudioInputDeviceOption {
  deviceId: string
  label: string
}

const AUDIO_MODE_INFO = (
  <>
    Turns on audio capture and analysis for level, energy, and optional beat/BPM
    detection. Required for audio modulation sources and the meters below.
  </>
)

const AUDIO_BEAT_CLOCK_INFO = (
  <>
    Drives master BPM and beat pulse from detected onsets in the selected input.
    When MIDI clock tempo is enabled under Connections, audio beat clock is
    unavailable — disable MIDI clock tempo there first.
  </>
)

const BPM_TAP_HINT_INFO = (
  <>
    With Audio Mode on, use the <strong>TAP</strong> button next to the tempo
    readout in the status bar (same as manual tap tempo). That feeds a
    short-lived hint into beat detection. Hints are not saved with the project.
  </>
)

const ADVANCED_BEAT_INFO = (
  <>
    Fine-tune onset sensitivity, minimum time between beats, and how quickly
    tracked BPM follows the signal. Useful when detection is too sparse or too
    chatty.
  </>
)

const INPUT_DEVICE_INFO = (
  <>
    Microphone or desktop loopback source used for analysis. Desktop Audio
    captures system output when supported. Refresh the list after plugging in
    hardware.
  </>
)

const INPUT_GAIN_INFO = (
  <>
    Scales incoming audio before analysis (0–4×). Raise if meters stay low;
    lower if the signal clips or overloads detection.
  </>
)

const BEAT_SENSITIVITY_INFO = (
  <>
    How strongly transients must stand out to count as a beat. Higher values
    trigger more often; lower values require clearer peaks.
  </>
)

const MIN_BEAT_INTERVAL_INFO = (
  <>
    Ignores beats closer than this interval, limiting the fastest tempo the
    detector will accept.
  </>
)

const BPM_RESPONSE_INFO = (
  <>
    How quickly estimated BPM adapts to new taps and onsets. Higher values follow
    faster but may jitter more on noisy material.
  </>
)

const METER_LEVEL_INFO =
  'Raw input loudness after gain — used for level-based modulation.'
const METER_ENERGY_INFO =
  'Smoothed envelope of the signal — used for energy-based modulation.'
const METER_BPM_LOCK_INFO =
  'Confidence that the current BPM estimate is stable (only when audio beat clock is on).'

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

function toRangeRatio(value: number, min: number, max: number) {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

function InfoHint({
  content,
  ariaLabel,
}: {
  content: ReactNode
  ariaLabel: string
}) {
  return (
    <Tooltip
      title={content}
      placement="top"
      enterDelay={350}
      slotProps={APP_TOOLTIP_SLOT_PROPS}
    >
      <InfoButton
        type="button"
        size="small"
        aria-label={ariaLabel}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <InfoOutlined sx={{ fontSize: '0.95rem' }} />
      </InfoButton>
    </Tooltip>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled = false,
  info,
  infoAriaLabel,
  toggleTitle,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  info?: ReactNode
  infoAriaLabel?: string
  toggleTitle?: string
}) {
  return (
    <ToggleRowRoot>
      <ToggleLabel title={toggleTitle ?? label}>{label}</ToggleLabel>
      {info !== undefined && (
        <InfoHint content={info} ariaLabel={infoAriaLabel ?? `About ${label}`} />
      )}
      <ToggleRowSpacer />
      <ToggleSwitch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        title={toggleTitle ?? label}
        aria-label={toggleTitle ?? label}
      />
    </ToggleRowRoot>
  )
}

function CaptivateSlider({
  min,
  max,
  step,
  value,
  disabled,
  onChange,
  title,
}: {
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
  title?: string
}) {
  const ratio = toRangeRatio(value, min, max)
  return (
    <SliderShell title={title}>
      <Range
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
      <SliderRail>
        <SliderFill style={{ width: `${ratio * 100}%` }} $disabled={disabled === true} />
      </SliderRail>
    </SliderShell>
  )
}

function remoteInputDeviceLabel(deviceId: string): string {
  if (deviceId === AUDIO_INPUT_DEVICE_DESKTOP) {
    return 'Desktop Audio (Loopback)'
  }
  if (deviceId.trim().length === 0) {
    return 'Default input (show computer)'
  }
  return 'Audio input on show computer'
}

export default function AudioInputMenu({
  remoteClient = false,
}: {
  /** True in the browser remote UI (no local device enumeration). */
  remoteClient?: boolean
}) {
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
    if (!open || remoteClient) {
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

  const menuIconTitle = settings.enabled
    ? 'Audio input settings (audio mode on)'
    : 'Audio input settings'

  return (
    <Root>
      <Tooltip title={menuIconTitle} placement="top" enterDelay={400}>
        <span>
          <IconButton
            title={menuIconTitle}
            onClick={() => setOpen((previous) => !previous)}
            size="small"
            sx={{
              color: settings.enabled ? 'primary.main' : 'text.secondary',
            }}
          >
            <MusicNoteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {open && (
        <Popup title="Audio Input" onClose={() => setOpen(false)}>
          {remoteClient ? (
            <RemoteHint>
              Audio is captured on the show computer. Meters and settings below apply
              there and sync to this remote session.
            </RemoteHint>
          ) : null}
          <ToggleRow
            label="Audio Mode"
            checked={settings.enabled}
            onChange={(next) => dispatch(setAudioInputEnabled(next))}
            info={AUDIO_MODE_INFO}
            infoAriaLabel="About audio mode"
            toggleTitle="Enable audio capture and analysis"
          />

          <ToggleRow
            label="Use Audio Beat Clock"
            checked={settings.useBeatClock}
            disabled={midiClockDrivesBpm}
            onChange={(next) => dispatch(setAudioBeatClockEnabled(next))}
            info={AUDIO_BEAT_CLOCK_INFO}
            infoAriaLabel="About audio beat clock"
            toggleTitle={
              midiClockDrivesBpm
                ? 'Disabled while MIDI clock tempo is on in Connections'
                : 'Drive BPM and beat pulse from audio onsets'
            }
          />

          {settings.enabled && (
            <Field>
              <LabelRow>
                <Label title="Optional tap-teach hint from status bar TAP">
                  BPM tap hint
                </Label>
                <InfoHint content={BPM_TAP_HINT_INFO} ariaLabel="About BPM tap hint" />
              </LabelRow>
              {settings.beatTapHintBpm != null && (
                <TapHintRow>
                  <span title="Current tap-teach BPM fed into beat detection">
                    Active hint: {settings.beatTapHintBpm} BPM
                  </span>
                  <SmallButton
                    type="button"
                    title="Remove the active tap hint"
                    onClick={() => dispatch(clearAudioBeatTapHint())}
                  >
                    Clear
                  </SmallButton>
                </TapHintRow>
              )}
            </Field>
          )}

          <Field>
            <LabelRow>
              <Label>Input Device</Label>
              <InfoHint content={INPUT_DEVICE_INFO} ariaLabel="About input device" />
            </LabelRow>
            {remoteClient ? (
              <RemoteDeviceLabel title="Selected on the show computer">
                {remoteInputDeviceLabel(selectedDeviceId)}
              </RemoteDeviceLabel>
            ) : (
              <Tooltip
                title={
                  loading
                    ? 'Refreshing audio device list…'
                    : 'Capture source for audio analysis'
                }
                placement="top"
                enterDelay={400}
              >
                <DeviceSelectWrap>
                  <DeviceSelect
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
                  </DeviceSelect>
                </DeviceSelectWrap>
              </Tooltip>
            )}
          </Field>

          <Field>
            <LabelRow>
              <Label>Input Gain ({settings.inputGain.toFixed(2)}×)</Label>
              <InfoHint content={INPUT_GAIN_INFO} ariaLabel="About input gain" />
            </LabelRow>
            <CaptivateSlider
              min={0}
              max={4}
              step={0.01}
              value={settings.inputGain}
              disabled={settings.enabled !== true}
              title="Input gain before analysis"
              onChange={(value) => dispatch(setAudioInputGain(value))}
            />
          </Field>

          <ToggleRow
            label="Advanced Beat Detection"
            checked={showAdvanced}
            onChange={setShowAdvanced}
            info={ADVANCED_BEAT_INFO}
            infoAriaLabel="About advanced beat detection"
            toggleTitle="Show sensitivity and BPM tuning controls"
          />

          {showAdvanced && (
            <>
              <Field>
                <LabelRow>
                  <Label>
                    Beat Sensitivity ({Math.round(settings.beatSensitivity * 100)}%)
                  </Label>
                  <InfoHint
                    content={BEAT_SENSITIVITY_INFO}
                    ariaLabel="About beat sensitivity"
                  />
                </LabelRow>
                <CaptivateSlider
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.beatSensitivity}
                  disabled={settings.enabled !== true}
                  title="Beat onset sensitivity"
                  onChange={(value) => dispatch(setAudioBeatSensitivity(value))}
                />
              </Field>
              <Field>
                <LabelRow>
                  <Label>Min Beat Interval ({settings.beatMinIntervalMs} ms)</Label>
                  <InfoHint
                    content={MIN_BEAT_INTERVAL_INFO}
                    ariaLabel="About minimum beat interval"
                  />
                </LabelRow>
                <CaptivateSlider
                  min={AUDIO_MIN_BEAT_INTERVAL_MS}
                  max={AUDIO_MAX_BEAT_INTERVAL_MS}
                  step={1}
                  value={settings.beatMinIntervalMs}
                  disabled={settings.enabled !== true}
                  title="Minimum milliseconds between detected beats"
                  onChange={(value) => dispatch(setAudioBeatMinIntervalMs(value))}
                />
              </Field>
              <Field>
                <LabelRow>
                  <Label>
                    BPM Response ({Math.round(settings.bpmSmoothing * 100)}%)
                  </Label>
                  <InfoHint content={BPM_RESPONSE_INFO} ariaLabel="About BPM response" />
                </LabelRow>
                <CaptivateSlider
                  min={AUDIO_MIN_BPM_SMOOTHING}
                  max={AUDIO_MAX_BPM_SMOOTHING}
                  step={0.01}
                  value={settings.bpmSmoothing}
                  disabled={settings.enabled !== true}
                  title="How quickly BPM estimate adapts"
                  onChange={(value) => dispatch(setAudioBpmSmoothing(value))}
                />
              </Field>
            </>
          )}

          <MetersSection>
            <MeterRow>
              <MeterLabelWrap>
                <MeterLabel>Level</MeterLabel>
                <InfoHint content={METER_LEVEL_INFO} ariaLabel="About level meter" />
              </MeterLabelWrap>
              <MeterTrack title={METER_LEVEL_INFO}>
                <MeterFill style={{ width: levelPercent(audioState.inputLevel) }} />
              </MeterTrack>
              <MeterValue title="Input level percentage">
                {levelPercent(audioState.inputLevel)}
              </MeterValue>
            </MeterRow>
            <MeterRow>
              <MeterLabelWrap>
                <MeterLabel>Energy</MeterLabel>
                <InfoHint content={METER_ENERGY_INFO} ariaLabel="About energy meter" />
              </MeterLabelWrap>
              <MeterTrack title={METER_ENERGY_INFO}>
                <MeterFill
                  style={{
                    width: levelPercent(audioState.energyLevel),
                    background: '#ffd36f',
                  }}
                />
              </MeterTrack>
              <MeterValue title="Energy envelope percentage">
                {levelPercent(audioState.energyLevel)}
              </MeterValue>
            </MeterRow>
            {settings.useBeatClock && (
              <MeterRow>
                <MeterLabelWrap>
                  <MeterLabel>BPM Lock</MeterLabel>
                  <InfoHint
                    content={METER_BPM_LOCK_INFO}
                    ariaLabel="About BPM lock meter"
                  />
                </MeterLabelWrap>
                <MeterTrack title={METER_BPM_LOCK_INFO}>
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
                <MeterValue title="BPM estimate confidence">
                  {Math.round(
                    Math.max(0, Math.min(1, audioState.detectedBpmConfidence || 0)) *
                      100
                  )}
                  % {confidenceLabel(audioState.detectedBpmConfidence)}
                </MeterValue>
              </MeterRow>
            )}
          </MetersSection>
          <BeatText
            title="Beat pulse and detected BPM when audio mode is active"
          >
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
  margin-bottom: 0.65rem;
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin-bottom: 0.28rem;
`

const Label = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const InfoButton = styled(IconButton)`
  && {
    padding: 0.1rem;
    color: ${(props) => props.theme.colors.text.secondary};
  }
  &&:hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`

const ToggleRowRoot = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
  min-height: 1.35rem;
`

const ToggleLabel = styled.span`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.primary};
`

const ToggleRowSpacer = styled.span`
  flex: 1 1 auto;
  min-width: 0;
`

const DeviceSelectWrap = styled.div`
  width: 100%;
`

const DeviceSelect = styled.select`
  width: 100%;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  padding: 0.3rem 0.4rem;
  font-size: 0.78rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const SliderShell = styled.div`
  position: relative;
  width: 100%;
  height: 1.15rem;
`

const Range = styled.input`
  width: 100%;
  height: 1.15rem;
  margin: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 2;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #8eb2ff;
    outline-offset: 2px;
  }

  &::-webkit-slider-runnable-track {
    height: 0.28rem;
    background: transparent;
    border: none;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 999px;
    background: transparent;
    border: none;
    margin-top: -0.34rem;
  }

  &::-moz-range-track {
    height: 0.28rem;
    background: transparent;
    border: none;
  }

  &::-moz-range-thumb {
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 999px;
    background: transparent;
    border: none;
  }
`

const SliderRail = styled.div`
  position: absolute;
  left: 0.2rem;
  right: 0.2rem;
  top: 50%;
  height: 0.28rem;
  transform: translateY(-50%);
  border-radius: 999px;
  background: #0007;
  border: 1px solid ${(props) => props.theme.colors.divider};
  pointer-events: none;
  overflow: hidden;
`

const SliderFill = styled.div<{ $disabled: boolean }>`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(70, 150, 210, 0.85), rgba(110, 190, 130, 0.9));
  opacity: ${(props) => (props.$disabled ? 0.35 : 1)};
  pointer-events: none;
`

const MetersSection = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.45rem;
  border-top: 1px solid ${(props) => props.theme.colors.divider};
`

const MeterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
`

const MeterLabelWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.05rem;
  width: 4.6rem;
  flex-shrink: 0;
`

const MeterLabel = styled.div`
  font-size: 0.7rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const MeterTrack = styled.div`
  flex: 1 1 auto;
  height: 0.45rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  overflow: hidden;
  background: ${(props) => props.theme.colors.bg.primary};
`

const MeterFill = styled.div`
  height: 100%;
  background: #6fd8ff;
  transition: width 80ms linear;
`

const MeterValue = styled.div`
  width: 5.6rem;
  text-align: right;
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const BeatText = styled.div`
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const TapHintRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const SmallButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  background: ${(props) => props.theme.colors.bg.lighter};
  color: ${(props) => props.theme.colors.text.primary};
  font-size: 0.68rem;
  padding: 0.14rem 0.45rem;
  cursor: pointer;

  &:hover {
    border-color: #7ed6a5;
    color: #dfffe8;
  }
`

const RemoteHint = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  line-height: 1.4;
  color: ${(props) => props.theme.colors.text.secondary};
`

const RemoteDeviceLabel = styled.div`
  font-size: 0.72rem;
  padding: 0.35rem 0.45rem;
  border-radius: 0.28rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.secondary};
`
