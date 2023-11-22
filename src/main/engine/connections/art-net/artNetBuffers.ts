import { getUniverseBuffer } from '../util'

// Low-byte first
// const OP_POLL = Buffer.from([0x00, 0x20]) // 0x2000
// const OP_POLL_REPLY = Buffer.from([0x00, 0x21]) // 0x2100
const OP_DMX = Buffer.from([0x00, 0x50]) // 0x5000

const PROTOCOL = Buffer.from([0, 14])
const UDP_ID = Buffer.from('Art-Net\0', 'ascii')

export function artDmxBuffer(universe: number[], universeIndex: number) {
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
