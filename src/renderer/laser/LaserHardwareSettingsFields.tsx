import styled from 'styled-components'
import type {
  LaserColorOutputMode,
  LaserDacCalibration,
  LaserDacHardwareSettings,
} from '../../shared/laserHardwareSettings'
import {
  createDefaultLaserDacCalibration,
  LASER_CALIBRATION_MASTER_SIZE_MAX_PCT,
  LASER_CALIBRATION_MASTER_SIZE_MIN_PCT,
  LASER_CALIBRATION_POSITION_MAX,
  LASER_CALIBRATION_ROTATION_MAX_DEG,
  LASER_CALIBRATION_SIZE_TRIM_MAX_PCT,
  LASER_CALIBRATION_SIZE_TRIM_MIN_PCT,
  LASER_DAC_SCAN_RATE_MAX_PPS,
  LASER_DAC_SCAN_RATE_MIN_PPS,
} from '../../shared/laserHardwareSettings'
import LaserCalibrationTestPatternToggle from './LaserCalibrationTestPatternToggle'
import {
  LaserFieldLabel,
  LaserInlineButton,
  LaserMuted,
  LaserRangeInput,
  LaserSectionTitle,
} from './laserUi'

export type LaserHardwareSettingsFieldsProps = {
  settings: LaserDacHardwareSettings
  onChange: (next: LaserDacHardwareSettings) => void
  showCalibration?: boolean
  testPatternActive?: boolean
  onTestPatternActiveChange?: (active: boolean) => void
  testPatternOutputReady?: boolean
}

export default function LaserHardwareSettingsFields({
  settings,
  onChange,
  showCalibration = true,
  testPatternActive = false,
  onTestPatternActiveChange,
  testPatternOutputReady = false,
}: LaserHardwareSettingsFieldsProps) {
  const patch = (partial: Partial<LaserDacHardwareSettings>) =>
    onChange({ ...settings, ...partial })

  const patchCalibration = (partial: Partial<LaserDacCalibration>) =>
    onChange({
      ...settings,
      calibration: { ...settings.calibration, ...partial },
    })

  return (
    <Root>
      <FieldBlock>
        <LaserSectionTitle>Color output</LaserSectionTitle>
        <LaserMuted>
          Analog modulates beam intensity (typical RGB lasers). TTL sends full-on
          or off per color channel.
        </LaserMuted>
        <RadioRow>
          {(
            [
              ['analog', 'Analog (modulated RGB)'],
              ['ttl', 'TTL (on/off per channel)'],
            ] as const
          ).map(([value, label]) => (
            <RadioLabel key={value}>
              <input
                type="radio"
                name="laser-color-mode"
                checked={settings.colorMode === value}
                onChange={() => patch({ colorMode: value as LaserColorOutputMode })}
              />
              {label}
            </RadioLabel>
          ))}
        </RadioRow>
      </FieldBlock>

      <FieldBlock>
        <LaserFieldLabel>
          Scan rate — {settings.scanRatePps.toLocaleString()} pps
        </LaserFieldLabel>
        <LaserMuted>
          Scanner point rate. Lower for long throws; raise for crisp small shapes
          within galvo limits.
        </LaserMuted>
        <LaserRangeInput
          min={LASER_DAC_SCAN_RATE_MIN_PPS}
          max={LASER_DAC_SCAN_RATE_MAX_PPS}
          step={500}
          value={settings.scanRatePps}
          onChange={(e) =>
            patch({ scanRatePps: Number.parseInt(e.target.value, 10) })
          }
        />
        <RangeTicks>
          <span>{LASER_DAC_SCAN_RATE_MIN_PPS.toLocaleString()}</span>
          <span>{LASER_DAC_SCAN_RATE_MAX_PPS.toLocaleString()}</span>
        </RangeTicks>
      </FieldBlock>

      <FieldBlock>
        <LaserFieldLabel>
          Output power — {Math.round(settings.outputPower01 * 100)}%
        </LaserFieldLabel>
        <LaserMuted>Global intensity scale applied to all RGB samples.</LaserMuted>
        <LaserRangeInput
          min={0}
          max={100}
          step={1}
          value={Math.round(settings.outputPower01 * 100)}
          onChange={(e) =>
            patch({
              outputPower01: Number.parseInt(e.target.value, 10) / 100,
            })
          }
        />
      </FieldBlock>

      {showCalibration ? (
        <CalibrationBlock>
          {onTestPatternActiveChange ? (
            <LaserCalibrationTestPatternToggle
              active={testPatternActive}
              onActiveChange={onTestPatternActiveChange}
              outputReady={testPatternOutputReady}
            />
          ) : null}

          <LaserSectionTitle>Size &amp; position</LaserSectionTitle>
          <LaserMuted>
            ILDA standard test pattern (same as LaserShowGen). Arm output, enable the
            pattern, then fit it to your screen. Tune until the circle touches the
            inner square. Scan rate uses 12K or 30K pps; lower Size if galvos sound
            strained.
          </LaserMuted>

          <SliderRow
            label="Size"
            value={settings.calibration.masterSizePct}
            min={LASER_CALIBRATION_MASTER_SIZE_MIN_PCT}
            max={LASER_CALIBRATION_MASTER_SIZE_MAX_PCT}
            step={1}
            format={(v) => `${Math.round(v)}%`}
            onChange={(v) => patchCalibration({ masterSizePct: v })}
          />
          <SliderRow
            label="X size"
            value={settings.calibration.sizeXPct}
            min={LASER_CALIBRATION_SIZE_TRIM_MIN_PCT}
            max={LASER_CALIBRATION_SIZE_TRIM_MAX_PCT}
            step={1}
            format={(v) => `${Math.round(v)}%`}
            onChange={(v) => patchCalibration({ sizeXPct: v })}
          />
          <SliderRow
            label="Y size"
            value={settings.calibration.sizeYPct}
            min={LASER_CALIBRATION_SIZE_TRIM_MIN_PCT}
            max={LASER_CALIBRATION_SIZE_TRIM_MAX_PCT}
            step={1}
            format={(v) => `${Math.round(v)}%`}
            onChange={(v) => patchCalibration({ sizeYPct: v })}
          />
          <SliderRow
            label="Rotation"
            value={settings.calibration.rotationDeg}
            min={-LASER_CALIBRATION_ROTATION_MAX_DEG}
            max={LASER_CALIBRATION_ROTATION_MAX_DEG}
            step={0.5}
            format={(v) => `${v.toFixed(1)}°`}
            onChange={(v) => patchCalibration({ rotationDeg: v })}
          />
          <SliderRow
            label="X position"
            value={settings.calibration.positionX}
            min={-LASER_CALIBRATION_POSITION_MAX}
            max={LASER_CALIBRATION_POSITION_MAX}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(v) => patchCalibration({ positionX: v })}
          />
          <SliderRow
            label="Y position"
            value={settings.calibration.positionY}
            min={-LASER_CALIBRATION_POSITION_MAX}
            max={LASER_CALIBRATION_POSITION_MAX}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(v) => patchCalibration({ positionY: v })}
          />

          <LaserInlineButton
            onClick={() =>
              patch({
                calibration: createDefaultLaserDacCalibration(),
              })
            }
          >
            Reset size &amp; position
          </LaserInlineButton>
        </CalibrationBlock>
      ) : null}
    </Root>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <SliderField>
      <SliderLabelRow>
        <span>{label}</span>
        <span>{format(value)}</span>
      </SliderLabelRow>
      <LaserRangeInput
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
    </SliderField>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
`

const CalibrationBlock = styled(FieldBlock)`
  padding-top: 0.35rem;
  border-top: 1px solid ${(p) => p.theme.colors.divider};
`

const RadioRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
`

const RangeTicks = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.66rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const SliderField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`

const SliderLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: ${(p) => p.theme.colors.text.secondary};
`
