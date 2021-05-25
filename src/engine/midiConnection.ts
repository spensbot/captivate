import { Input } from 'midi'
import { parseMessage, MidiMessage } from './midi'

interface MidiInput {
  id: string
  value?: number
}

function getInputID(msg: MidiMessage): string {
  if (msg.type === 'On' || msg.type === 'Off') return 'note' + msg.keyNumber.toString()
  if (msg.type === 'CC') return 'cc' + msg.number
  return 'unknown'
}

function getInput(msg: MidiMessage): MidiInput {
  let value = undefined
  if (msg.type === 'On') value = msg.velocity
  if (msg.type === 'CC') value = msg.value
  return {
    id: getInputID(msg),
    value: value
  }
}

interface Options {
  updateInterval: number
  onMessage: (message: MidiInput | null) => void
  onConnect: () => void
  onDisconnect: () => void
}

export default function maintain(options: Options) {
  const input = new Input()

  setInterval(() => {
    updateInput(input, options)
  }, options.updateInterval)
}

function updateInput(input: Input, options: Options) {
  const portCount = input.getPortCount()

  if (input.isPortOpen()) {
    // input.closePort()
  } else if (portCount === 0) {
  } else {
    for (let i = 0; i < portCount; i++) {
      console.log(input.getPortName(i))
    }
  
    input.on('message', (dt, message) => {
      const midiMessage = parseMessage(message)
      if (midiMessage) options.onMessage(getInput(midiMessage))
      // I think dt is the seconds since the last message
      // I'm not sure what that's good for yet?
    })
  
    input.openPort(0)

    options.onConnect()
  }
}
