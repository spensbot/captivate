export type DeviceId = string

export interface DmxDevice_t {
  id: DeviceId
  path: string
  manufacturer?: string
  pnpId?: string
  productId?: string
  serialNumber?: string
  vendorId?: string
}

export interface MidiDevice_t {
  id: DeviceId
  name: string
}

export interface DmxConnections {
  connected: DeviceId[]
  available: DmxDevice_t[]
}

export interface MidiConnections {
  connected: DeviceId[]
  available: MidiDevice_t[]
}

export function initMidiConnections(): MidiConnections {
  return {
    connected: [],
    available: [],
  }
}

export function initDmxConnections(): DmxConnections {
  return {
    connected: [],
    available: [],
  }
}
