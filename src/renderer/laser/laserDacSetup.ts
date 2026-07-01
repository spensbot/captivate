import type { LaserProjectState } from './laserProjectState'

/** True when the user has not finished the laser DAC setup wizard yet. */
export function needsLaserDacSetup(
  laser: Pick<LaserProjectState, 'laserDacSetupComplete'>
): boolean {
  return laser.laserDacSetupComplete !== true
}
