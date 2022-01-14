import * as DmxConnection from './dmxConnection'
import * as MidiConnection from './midiConnection'
import NodeLink from 'node-link'

let _nodeLink = new NodeLink()

DmxConnection.maintain({
  update_ms: 1000,
  onUpdate: (path) => {
    console.log(path ? `Dmx connected: ${path}` : `Dmx not connected`)
  },
  calculateChannels: () => {
    return new Array(512).fill(0)
  },
})

MidiConnection.maintain({
  update_ms: 1000,
  onUpdate: (activeDevices) => {
    console.log(`Midi Devices: ${activeDevices}`)
  },
  onMessage: (message) => console.log(`Midi Message: ${message?.id}`),
})
