import { SerialportInfo, DmxDevice_t, ConnectionId } from 'shared/connection'

function getConnectionId(port: SerialportInfo): ConnectionId {
  return port.serialNumber ?? port.path
}

function isDmxDevice(port: SerialportInfo): boolean {
  return port.productId === '6001'
}

export function getDmxDevice(port: SerialportInfo): DmxDevice_t | null {
  if (!isDmxDevice(port)) return null

  return {
    type: null,
    connectionId: getConnectionId(port),
    path: port.path,
    manufacturer: port.manufacturer,
    pnpId: port.pnpId,
    productId: port.productId,
    serialNumber: port.serialNumber,
    vendorId: port.vendorId,
    name: 'Dmx Usb Device',
  }
}
