import ToggleSwitch from '../base/ToggleSwitch'
import {
  LaserMuted,
  LaserSection,
  LaserToggleLabel,
  LaserToggleRow,
} from './laserUi'

export type LaserCalibrationTestPatternProps = {
  active: boolean
  onActiveChange: (active: boolean) => void
  /** When false, show why the pattern cannot be sent to the DAC yet. */
  outputReady?: boolean
  compact?: boolean
}

export default function LaserCalibrationTestPatternToggle({
  active,
  onActiveChange,
  outputReady = false,
}: LaserCalibrationTestPatternProps) {
  return (
    <LaserSection style={{ border: 'none', padding: 0, background: 'transparent' }}>
      <LaserToggleRow>
        <LaserToggleLabel>Send calibration test pattern</LaserToggleLabel>
        <ToggleSwitch
          checked={active}
          onChange={onActiveChange}
          aria-label="Send calibration test pattern to DAC"
        />
      </LaserToggleRow>
      <LaserMuted>
        ILDA standard test pattern for galvo tuning (circle-in-square, damping
        marks, blanking tests).
        {active ? (
          outputReady ? (
            <> Pattern is streaming while output is armed.</>
          ) : (
            <>
              {' '}
              Connect the DAC and hold Arm to send the pattern to your projector.
            </>
          )
        ) : (
          <> Enable while adjusting size, position, and rotation.</>
        )}
      </LaserMuted>
    </LaserSection>
  )
}
