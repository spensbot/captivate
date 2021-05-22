import { Message } from 'midi'

export type MidiMessage = NoteOn | NoteOff | ControlChange | null
interface Note {
  keyNumber: number
  velocity: number
}
interface NoteOn extends Note { type: 'On' }
interface NoteOff extends Note { type: 'Off' }
interface ControlChange {
  type: 'CC'
  number: number
  value: number
}

export function parseMessage([status, data1, data2]: Message): MidiMessage {
  const [messageType, channel] = getHexDigits(status)

  if (messageType === 8) return {
    type: 'Off',
    keyNumber: data1,
    velocity: data2
  }
  if (messageType === 9) return {
    type: 'On',
    keyNumber: data1,
    velocity: data2
  }
  if (messageType === 11) return {
    type: 'CC',
    number: data1,
    value: data2
  }
  return null
}

function getHexDigits(byte: number): [number, number] {
  const lsd = byte % 16
  const msd = (byte - lsd) / 16
  // const ms = Math.floor(byte / 16)
  return [msd, lsd]
}