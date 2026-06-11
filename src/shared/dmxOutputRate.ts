/** Art-Net DMX packet period used by the output engine. */
export const ARTNET_DMX_PERIOD_MS = 1000 / 44

export interface DmxOutputRateDeviceState {
  connectable: {
    artNet: string[]
    dmx?: string[]
  }
  connectionSettings: {
    openDmxRefreshRateHz?: number
  }
}

/** Highest configured DMX output refresh among active connection targets. */
export function getConfiguredDmxOutputRateHz(
  device: DmxOutputRateDeviceState
): number {
  const openDmxRefreshHz =
    device.connectionSettings.openDmxRefreshRateHz ?? 30
  const configuredOpenDmx = Number.isFinite(openDmxRefreshHz)
    ? Math.max(1, openDmxRefreshHz)
    : 30

  let rateHz = configuredOpenDmx

  const artNetTarget = (device.connectable.artNet[0] ?? '').trim()
  if (artNetTarget.length > 0) {
    rateHz = Math.max(rateHz, 1000 / ARTNET_DMX_PERIOD_MS)
  }

  const hasUsbDmx = (device.connectable.dmx?.length ?? 0) > 0
  if (hasUsbDmx) {
    rateHz = Math.max(rateHz, 40)
  }

  return rateHz
}

export function getDmxOutputPollIntervalMs(
  device: DmxOutputRateDeviceState
): number {
  return 1000 / getConfiguredDmxOutputRateHz(device)
}
