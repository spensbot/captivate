export type ConnectionId = string

export interface DmxDevice_t {
  connectionId: ConnectionId
  path: string
  manufacturer?: string
  pnpId?: string
  productId?: string
  serialNumber?: string
  vendorId?: string
  name: string
}

export interface SerialportInfo {
  path: string
  manufacturer: string | undefined
  serialNumber: string | undefined
  pnpId: string | undefined
  locationId: string | undefined
  productId: string | undefined
  vendorId: string | undefined
}

export interface MidiDevice_t {
  connectionId: ConnectionId
  name: string
}

export interface DmxConnections {
  connected: ConnectionId[]
  available: DmxDevice_t[]
  serialports: SerialportInfo[]
}

export interface MidiConnections {
  connected: ConnectionId[]
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
    serialports: [],
  }
}
