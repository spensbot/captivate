import { SerialportInfo, DmxDevice_t, ConnectionId } from 'shared/connection'

function getConnectionId(port: SerialportInfo): ConnectionId {
  return port.serialNumber ?? port.path
}

function normUsbId(v: string | undefined): string {
  if (v == null || typeof v !== 'string') return ''
  return v.trim().toLowerCase().replace(/^0x/i, '')
}

/**
 * USB serial adapters we treat as DMX-capable for listing in Devices.
 * - FTDI 0403:6001 is used by Enttec DMX USB Pro, Euro Light USB Pro, and many FTDI-based clones.
 * - Matching on product id alone matches historical Captivate behavior (some hosts omit vendor id).
 */
function isDmxDevice(port: SerialportInfo): boolean {
  const pid = normUsbId(port.productId)
  const vid = normUsbId(port.vendorId)
  if (pid !== '6001') return false
  return vid === '' || vid === '0403'
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
