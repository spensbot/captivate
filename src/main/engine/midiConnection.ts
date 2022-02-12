import { Input } from 'midi'
import { parseMessage, MidiMessage } from '../../shared/midi'
import { ConnectionStatus, Devices } from '../../shared/connection'

export type UpdatePayload = ConnectionStatus
export type MessagePayload = MidiMessage

interface Config {
  update_ms: number
  onUpdate: (activeDevices: UpdatePayload) => void
  onMessage: (message: MessagePayload) => void
  getConnectable: () => Devices
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
  const availablePortNames: string[] = []

  for (let i = 0; i < portCount; i++) {
    const portName = refInput.getPortName(i)
    availablePortNames.push(portName)
    if (inputs[portName] === undefined) {
      const connectable = config.getConnectable()
      if (connectable.find((c) => c === portName)) {
        inputs[portName] = newInput(i, config)
      }
    }
  }

  for (const oldPortName in inputs) {
    if (
      availablePortNames.find(
        (activePortName) => activePortName === oldPortName
      ) === undefined
    ) {
      delete inputs[oldPortName]
      console.log(`Removing Midi Connection: ${oldPortName}`)
    }
  }

  config.onUpdate({
    available: [],
    connected: [],
  })
}

function newInput(index: number, config: Config) {
  const input = new Input()

  input.on('message', (_dt, message) => {
    const midiMessage = parseMessage(message)
    if (midiMessage) config.onMessage(midiMessage)
    // I think dt is the seconds since the last message
    // I'm not sure what that's good for yet?
  })

  input.openPort(index)

  console.log(`New Midi connection: ${input.getPortName(index)}`)

  return input
}
