import { Input } from 'midi'
import { parseMessage, MidiMessage } from '../../engine/midi'

export type UpdatePayload = string[]
export type MessagePayload = MidiMessage

interface Config {
  update_ms: number
  onUpdate: (activeDevices: UpdatePayload) => void
  onMessage: (message: MessagePayload) => void
}

const refInput = new Input()
// const inputs: Input[] = []
const inputs: Inputs = {}
type Inputs = { [portName: string]: Input }

export function maintain(config: Config) {
  setInterval(() => {
    updateInputs(config)
  }, config.update_ms)
}

function updateInputs(config: Config) {
  const portCount = refInput.getPortCount()
  const activePortNames: string[] = []

  for (let i = 0; i < portCount; i++) {
    const portName = refInput.getPortName(i)
    activePortNames.push(portName)
    if (inputs[portName] === undefined) {
      //TODO: (Spenser) better ability to disable midi inputs
      if (portName !== 'DDJ-SB3') {
        inputs[portName] = newInput(i, config)
      }
    }
  }

  for (const oldPortName in inputs) {
    if (
      activePortNames.find(
        (activePortName) => activePortName === oldPortName
      ) === undefined
    ) {
      delete inputs[oldPortName]
      console.log(`Removing Midi Connection: ${oldPortName}`)
    }
  }

  config.onUpdate(activePortNames)
}

function newInput(index: number, config: Config) {
  const input = new Input()

  input.on('message', (dt, message) => {
    const midiMessage = parseMessage(message)
    if (midiMessage) config.onMessage(midiMessage)
    // I think dt is the seconds since the last message
    // I'm not sure what that's good for yet?
  })

  input.openPort(index)

  console.log(`New Midi connection: ${input.getPortName(index)}`)

  return input
}
