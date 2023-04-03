import { Input } from 'midi'
import { parseMessage, MidiMessage } from '../../../shared/midi'
import {
  MidiConnections,
  ConnectionId,
  MidiDevice_t,
} from '../../../shared/connection'
import throttle from 'lodash.throttle'

export type UpdatePayload = MidiConnections
export type MessagePayload = MidiMessage

interface Config {
  update_ms: number
  onUpdate: (activeDevices: UpdatePayload) => void
  onMessage: (message: MessagePayload) => void
  getConnectable: () => ConnectionId[]
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
  const connected: ConnectionId[] = []
  const connectable = config.getConnectable()

  for (let i = 0; i < portCount; i++) {
    const portName = refInput.getPortName(i)
    availableMidiDevice_ts.push({
      connectionId: portName,
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
    }
    if (!connectable.find((c) => c === oldPortName)) {
      inputs[oldPortName].closePort()
      delete inputs[oldPortName]
    }
  }

  for (const portName in inputs) {
    connected.push(portName)
  }

  let status: MidiConnections = {
    available: availableMidiDevice_ts,
    connected: connected,
  }

  config.onUpdate(status)
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

  return input
}

export class ThrottleMap<T> {
  throttles: { [id: string]: ReturnType<typeof throttle> | undefined } = {}
  f: (arg: T) => void
  period: number

  constructor(f: (arg: T) => void, period: number) {
    this.f = f
    this.period = period
  }

  call(id: string, arg: any) {
    let throttled = this.throttles[id]
    if (throttled === undefined) {
      // leading and trailing set to true ensures that the first and last midi note during the interval are always sent
      throttled = throttle(this.f, this.period, {
        leading: true,
        trailing: true,
      })
      this.throttles[id] = throttled
    }
    throttled(arg)
  }
}
