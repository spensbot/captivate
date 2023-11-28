import { getUniverseBuffer } from '../util'
import { DmxUsbDeviceConfig } from './DmxConnectionUsb'

const ENTTEC_PRO_DMX_STARTCODE = 0x00
const ENTTEC_PRO_START_OF_MSG = 0x7e
const ENTTEC_PRO_END_OF_MSG = 0xe7
const ENTTEC_PRO_SEND_DMX_RQ = 0x06
// var ENTTEC_PRO_RECV_DMX_PKT = 0x05;

const cfg: DmxUsbDeviceConfig = {
  refreshHz: 40,
  sendUniverse: async (universe, connection) => {
    const universeBuffer = getUniverseBuffer(universe)
    const dataLength = universeBuffer.length + 1 // Includes startcode
    const hdr = Buffer.from([
      ENTTEC_PRO_START_OF_MSG,
      ENTTEC_PRO_SEND_DMX_RQ,
      dataLength & 0xff,
      (dataLength >> 8) & 0xff,
      ENTTEC_PRO_DMX_STARTCODE,
    ])

    const buffer = Buffer.concat([
      hdr,
      universeBuffer,
      Buffer.from([ENTTEC_PRO_END_OF_MSG]),
    ])

    connection.write(buffer)
  },
}

export default cfg
