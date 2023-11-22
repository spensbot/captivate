import { SerialportInfo, DmxDevice_t, ConnectionId } from 'shared/connection'

const dmxDeviceNames: { [key in DmxDevice_t['type']]: string } = {
  DmxUsbPro: 'Dmx Usb Pro',
  OpenDmxUsb: 'Open Dmx Usb',
}

function getConnectionId(port: SerialportInfo): ConnectionId {
  return port.path
}

function getDmxDeviceType(port: SerialportInfo): DmxDevice_t['type'] | null {
  const mfg = port.manufacturer

  if (mfg?.includes('DMX') || mfg?.includes('ENTTEC')) return 'DmxUsbPro'
  else if (mfg?.includes('FTDI')) return 'OpenDmxUsb'

  return null
}

export function getDmxDevice(port: SerialportInfo): DmxDevice_t | null {
  let type = getDmxDeviceType(port)
  if (type === null) return null

  return {
    type,
    connectionId: getConnectionId(port),
    path: port.path,
    manufacturer: port.manufacturer,
    pnpId: port.pnpId,
    productId: port.productId,
    serialNumber: port.serialNumber,
    vendorId: port.vendorId,
    name: dmxDeviceNames[type],
  }
}
