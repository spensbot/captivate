export type DevicePath = string

export type Devices = DevicePath[]

export type ConnectionType = 'dmx' | 'midi'

export interface ConnectionStatus {
  connected: Devices
  available: Devices
}

export function initConnectionStatus(): ConnectionStatus {
  return {
    connected: [],
    available: [],
  }
}
