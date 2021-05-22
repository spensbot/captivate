import { Input } from 'midi'
import { parseMessage, MidiMessage } from './midi'

interface Options {
  updateInterval: number
  onMessage: (message: MidiMessage) => void
  onConnect: () => void
  onDisconnect: () => void
}

export function maintain(options: Options) {
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
      options.onMessage(midiMessage)
      // I think dt is the seconds since the last message
      // I'm not sure what that's good for yet?
    })
  
    input.openPort(0)

    options.onConnect()
  }
}
