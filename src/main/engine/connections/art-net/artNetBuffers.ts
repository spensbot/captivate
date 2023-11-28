import { getUniverseBuffer, nullTerminatedStringPadded } from '../util'
import * as ipUtil from '../ipUtil'
import * as c from './constants'

// Low-byte first
const OP_POLL = Buffer.from([0x00, 0x20]) // 0x2000
const OP_POLL_REPLY = Buffer.from([0x00, 0x21]) // 0x2100
const OP_DMX = Buffer.from([0x00, 0x50]) // 0x5000

const PROTOCOL = Buffer.from([0, 14])
const UDP_ID = Buffer.from('Art-Net\0', 'ascii')

// const STYLE_NODE = 0x01
const STYLE_CONTROLLER = 0x01

export function artDmxBuffer(
  universe: number[],
  universeIndex: number
): Buffer {
  return Buffer.concat([
    UDP_ID,
    OP_DMX,
    PROTOCOL,
    Buffer.from([
      0x00, //Sequence: 0x01 to 0xff for ordering. 0x00 to disable
      0x00, // Physical: Physical port input id
      universeIndex, // SubUni: The low byte of the 15 bit Port-Address to which this packet is destined.
      0x00, // Net: The top 7 bits of the 15 bit Port-Address to which this packet is destined.
      0x02, // Hi - Length of the DMX512 data array. 0x200 == 512
      0x00, // Low -
    ]),
    getUniverseBuffer(universe),
  ])
}

export function artPollBuffer(): Buffer {
  return Buffer.concat([
    UDP_ID,
    OP_POLL,
    PROTOCOL,
    Buffer.from([
      0b00000000, // Flags:
      0x00, // Diagnostic Priority
    ]),
    // All other fields are not required
  ])
}

export function artPollReplyBuffer(): Buffer | null {
  const thisIpBuffer = ipUtil.thisIpBuffer
  const thisMacBuffer = ipUtil.thisMacBuffer
  const portName = nullTerminatedStringPadded('Port', 18)
  const nodeName = nullTerminatedStringPadded('Captivate', 64)
  const nodeReport = nullTerminatedStringPadded('#[1]Ok', 64)

  if (!thisIpBuffer || !thisMacBuffer || !portName || !nodeName || !nodeReport)
    return null

  return Buffer.concat([
    UDP_ID,
    OP_POLL_REPLY,
    thisIpBuffer,
    Buffer.from([
      c.ARTNET_PORT,
      0, // version hi
      0, // version lo
      0, // Net
      0, // Sub
      0, // Oem Hi
      0, // Oem Lo
      0, // Ubea Version,
      0b00_00_0_0_0_0, // Status 1
      0, // Esta Mfg Lo,
      0, // Esta Mfg Hi,
    ]),
    portName,
    nodeName,
    nodeReport,
    Buffer.alloc(2 + 4 + 4 + 4 + 4 + 4), // Port info. Unnecessary for a controller like captivate with no ports,
    Buffer.from([
      0, // AcnPriority
      0, // SwMacro
      0, //  SwRemote
    ]),
    Buffer.alloc(3), // Spares
    Buffer.from([STYLE_CONTROLLER]),
  ])
  // All other fields not required
}
