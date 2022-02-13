import { Input } from 'midi'
import { parseMessage, MidiMessage } from '../../shared/midi'
import {
  MidiConnections,
  DeviceId,
  MidiDevice_t,
} from '../../shared/connection'

export type UpdatePayload = MidiConnections
export type MessagePayload = MidiMessage

interface Config {
  update_ms: number
  onUpdate: (activeDevices: UpdatePayload) => void
  onMessage: (message: MessagePayload) => void
  getConnectable: () => DeviceId[]
}

const refInput = new Input()
const inputs: Inputs = {}
type Inputs = { [portName: string]: Input }

export function maintain(config: Config) {
  setInterval(() => {
    updateInputs(config)
  }, config.update_ms)
}

function updateInputs(config: Config) {
  const portCount = refInput.getPortCount()
  const availableMidiDevice_ts: MidiDevice_t[] = []
  const connected: DeviceId[] = []
  const connectable = config.getConnectable()

  for (let i = 0; i < portCount; i++) {
    const portName = refInput.getPortName(i)
    availableMidiDevice_ts.push({
      id: portName,
      name: portName,
    })
    if (inputs[portName] === undefined) {
      if (connectable.find((c) => c === portName)) {
        inputs[portName] = newInput(i, config)
      }
    }
  }

  for (const oldPortName in inputs) {
    if (!availableMidiDevice_ts.find((d) => d.name === oldPortName)) {
      delete inputs[oldPortName]
      console.log(`Removing Midi Connection: ${oldPortName}`)
    }
    if (!connectable.find((c) => c === oldPortName)) {
      inputs[oldPortName].closePort()
      delete inputs[oldPortName]
    }
  }

  for (const portName in inputs) {
    connected.push(portName)
  }

  config.onUpdate({
    available: availableMidiDevice_ts,
    connected: connected,
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
