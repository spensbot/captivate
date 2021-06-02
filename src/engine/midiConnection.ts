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
  onConnect: (deviceName: string) => void
  onDisconnect: () => void
}

const refInput = new Input()
// const inputs: Input[] = []
const inputs: Inputs = {}
type Inputs = { [portName: string]: Input }

export default function maintain(options: Options) {
  setInterval(() => {
    updateInputs(options)
  }, options.updateInterval)
}

function updateInputs(options: Options) {
  const portCount = refInput.getPortCount()
  const activePortNames: string[] = []
  
  for (let i = 0; i < portCount; i++) {
    const portName = refInput.getPortName(i)
    activePortNames.push(portName)
    if (inputs[portName] === undefined) {
      inputs[portName] = newInput(i, options)
    }
  }

  for (const oldPortName in inputs) {
    if (activePortNames.find(activePortName => activePortName === oldPortName) === undefined) {
      delete inputs[oldPortName]
      console.log(`Removing Midi Connection: ${oldPortName}`)
      options.onDisconnect()
    }
  }
}

function newInput(index: number, options: Options) {
  const input = new Input()

  input.on('message', (dt, message) => {
    const midiMessage = parseMessage(message)
    if (midiMessage) options.onMessage(getInput(midiMessage))
    // I think dt is the seconds since the last message
    // I'm not sure what that's good for yet?
  })

  input.openPort(index)

  console.log(`New Midi connection: ${input.getPortName(index)}`)
  options.onConnect(input.getPortName(index))

  return input
}


// function updateInputs(options: Options) {
//   const portCount = refInput.getPortCount()
  
//   while (inputs.length < portCount) {
//     inputs.push(new Input())
//   }
//   while (inputs.length > portCount) {
//     inputs.pop()
//     if (inputs.length === 0) {
//       options.onDisconnect()
//       console.log('All Midi Devices Disconnected')
//     }
//   }

//   inputs.forEach((input, index) => {
//     updateInput(input, index, options)
//   })
// }

// function newInput(input: Input, index: number, options: Options) {
//   if (!input.isPortOpen()) {
  
//     input.on('message', (dt, message) => {
//       const midiMessage = parseMessage(message)
//       if (midiMessage) options.onMessage(getInput(midiMessage))
//       // I think dt is the seconds since the last message
//       // I'm not sure what that's good for yet?
//     })
  
//     input.openPort(index)

//     console.log(`New Midi connection: ${input.getPortName(index)}`)
//     options.onConnect(input.getPortName(index))
//   }
// }
