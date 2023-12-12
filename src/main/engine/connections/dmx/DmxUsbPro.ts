import { indexArray } from '../../../../shared/util'
import { SerialConnection } from '../SerialConnection'
import { getUniverseBuffer } from '../util'
import { DmxUsbDeviceConfig } from './DmxConnectionUsb'

const messageLabels = {
  getWidgetParametersRequest: 0x03,
  getWidgetParametersReply: 0x03,
  sendDmxPacketRequest: 0x06,
}

const ENTTEC_PRO_START_OF_MSG = 0x7e
const ENTTEC_PRO_DMX_STARTCODE = 0x00
const ENTTEC_PRO_END_OF_MSG = 0xe7

function getMessageBuffer(
  messageType: keyof typeof messageLabels,
  data: Buffer
) {
  const header = Buffer.from([
    ENTTEC_PRO_START_OF_MSG,
    messageLabels[messageType],
    data.length & 0xff,
    (data.length >> 8) & 0xff,
  ])

  return Buffer.concat([header, data, Buffer.from([ENTTEC_PRO_END_OF_MSG])])
}

export async function isDmxUsbPro(
  connection: SerialConnection
): Promise<boolean> {
  const dataBuffer = Buffer.from([
    0x00, // LSB config size
    0x00, // MSB config size
  ])

  for (const _i of indexArray(1)) {
    const start = Date.now()
    let reply = await connection.writeAndAwaitReply(
      getMessageBuffer('getWidgetParametersRequest', dataBuffer),
      300
    )
    const end = Date.now()

    if (
      reply &&
      reply.length > 1 &&
      reply[0] === ENTTEC_PRO_START_OF_MSG &&
      reply[reply.length - 1] === ENTTEC_PRO_END_OF_MSG
    ) {
      console.log(`Dmx USB Pro detection time: ${end - start}ms`)
      return true
    }
  }

  return false
}

const cfg: DmxUsbDeviceConfig = {
  refreshHz: () => 40, // Dmx Usb Pro devices are reliable and don't need configurable refresh rate
  sendUniverse: async (universe, connection) => {
    const dataBuffer = Buffer.concat([
      Buffer.from([ENTTEC_PRO_DMX_STARTCODE]),
      getUniverseBuffer(universe),
    ])
    connection.write(getMessageBuffer('sendDmxPacketRequest', dataBuffer))
  },
  name: 'Dmx Usb Pro',
}

export default cfg
