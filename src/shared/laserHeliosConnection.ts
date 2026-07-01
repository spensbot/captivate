import type { LaserDacBackend, LaserDacDeviceInfo } from './laserDac'

/** True when target should resolve to the first Helios device index. */
export function isHeliosAutoDiscoverTarget(target: string): boolean {
  const t = target.trim()
  return t.length === 0 || /^auto(\s|$|discover)/i.test(t)
}

export function defaultConnectionTargetForBackend(
  backend: LaserDacBackend
): string {
  switch (backend) {
    case 'helios':
      return '0'
    case 'etherdream':
      return 'Auto discover'
    case 'generic':
      return '127.0.0.1'
    case 'fb4':
    default:
      return ''
  }
}

/** Pick a valid Helios device index string after USB scan. */
export function pickHeliosDeviceTarget(
  devices: LaserDacDeviceInfo[],
  connectionTarget: string
): string {
  if (devices.length === 0) {
    return '0'
  }

  const trimmed = connectionTarget.trim()
  if (
    !isHeliosAutoDiscoverTarget(trimmed) &&
    /^\d+$/.test(trimmed) &&
    devices.some((d) => d.id === trimmed)
  ) {
    return trimmed
  }

  return devices[0]!.id
}

export function heliosTargetLabel(
  connectionTarget: string,
  devices: LaserDacDeviceInfo[]
): string {
  const id = pickHeliosDeviceTarget(devices, connectionTarget)
  return devices.find((d) => d.id === id)?.label ?? `Device ${id}`
}
