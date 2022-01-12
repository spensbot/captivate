import { Message } from 'midi'

export type MidiMessage = NoteOn | NoteOff | ControlChange
interface Note {
  number: number
}
interface NoteOn extends Note {
  type: 'On'
  velocity: number
}
interface NoteOff extends Note {
  type: 'Off'
}
interface ControlChange {
  type: 'CC'
  number: number
  value: number
}

export function parseMessage([
  status,
  data1,
  data2,
]: Message): MidiMessage | null {
  const [messageType, channel] = getHexDigits(status)

  if (messageType === 8)
    return {
      type: 'Off',
      number: data1,
    }
  if (messageType === 9)
    return {
      type: 'On',
      number: data1,
      velocity: data2,
    }
  if (messageType === 11)
    return {
      type: 'CC',
      number: data1,
      value: data2,
    }
  return null
}

function getHexDigits(byte: number): [number, number] {
  const lsd = byte % 16
  const msd = (byte - lsd) / 16
  // const ms = Math.floor(byte / 16)
  return [msd, lsd]
}
