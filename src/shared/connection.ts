export type ConnectionId = string

export interface DmxDeviceUsb_t {
  type: 'DmxUsbPro' | 'OpenDmxUsb'
  connectionId: ConnectionId
  path: string
  manufacturer?: string
  pnpId?: string
  productId?: string
  serialNumber?: string
  vendorId?: string
  name: string
}

export type DmxDevice_t = DmxDeviceUsb_t

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

export interface ArtNetConnectionInfo {}

export interface DmxConnectionInfo {
  connected: ConnectionId[]
  available: DmxDevice_t[]
  serialports: SerialportInfo[]
  artNet: ArtNetConnectionInfo
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

export function initDmxConnections(): DmxConnectionInfo {
  return {
    connected: [],
    available: [],
    serialports: [],
    artNet: {
      ipOut: null,
    },
  }
}
