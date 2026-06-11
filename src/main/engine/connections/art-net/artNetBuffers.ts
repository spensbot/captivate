import { DMX_MAX_VALUE, DMX_MIN_VALUE, DMX_NUM_CHANNELS } from 'shared/dmxFixtures'
import { nullTerminatedStringPadded } from '../util'
import * as ipUtil from '../ipUtil'
import * as c from './constants'

const ARTNET_HEADER_LEN = 18
const ARTNET_PACKET_LEN = ARTNET_HEADER_LEN + DMX_NUM_CHANNELS

const UDP_ID = Buffer.from('Art-Net\0', 'ascii')
const OP_DMX = Buffer.from([0x00, 0x50])
const OP_POLL = Buffer.from([0x00, 0x20])
const OP_POLL_REPLY = Buffer.from([0x00, 0x21])
const PROTOCOL = Buffer.from([0, 14])

const STYLE_CONTROLLER = 0x01

export function createArtDmxPacketBuffer(universeIndex: number): Buffer {
  const packet = Buffer.alloc(ARTNET_PACKET_LEN)
  UDP_ID.copy(packet, 0)
  OP_DMX.copy(packet, 8)
  PROTOCOL.copy(packet, 10)
  packet[13] = 0x00 // Physical port
  packet[14] = universeIndex & 0xff // SubUni
  packet[15] = 0x00 // Net
  packet[16] = 0x02 // DMX length hi (512)
  packet[17] = 0x00 // DMX length lo
  return packet
}

export function writeArtDmxPacket(
  packet: Buffer,
  universe: number[],
  sequence: number
): void {
  packet[12] = sequence & 0xff
  const offset = ARTNET_HEADER_LEN
  const count = Math.min(DMX_NUM_CHANNELS, universe.length)
  for (let index = 0; index < count; index++) {
    const raw = universe[index]
    packet[offset + index] = Number.isFinite(raw)
      ? Math.max(DMX_MIN_VALUE, Math.min(DMX_MAX_VALUE, Math.round(raw)))
      : 0
  }
  if (count < DMX_NUM_CHANNELS) {
    packet.fill(0, offset + count, offset + DMX_NUM_CHANNELS)
  }
}

export function artDmxBuffer(
  universe: number[],
  universeIndex: number
): Buffer {
  const packet = createArtDmxPacketBuffer(universeIndex)
  writeArtDmxPacket(packet, universe, 0)
  return packet
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
  ])
}

export function artPollReplyBuffer(): Buffer | null {
  const thisIpBuffer = ipUtil.thisIpBuffer
  const thisMacBuffer = ipUtil.thisMacBuffer
  const portName = nullTerminatedStringPadded('Port', 18)
  const nodeName = nullTerminatedStringPadded('Captivate 2', 64)
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
    Buffer.alloc(2 + 4 + 4 + 4 + 4 + 4),
    Buffer.from([
      0, // AcnPriority
      0, // SwMacro
      0, //  SwRemote
    ]),
    Buffer.alloc(3), // Spares
    Buffer.from([STYLE_CONTROLLER]),
  ])
}
