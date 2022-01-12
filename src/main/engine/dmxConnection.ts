//Much of this code is adapted from: https://github.com/node-dmx/dmx

import 'regenerator-runtime'
import SerialPort from 'serialport'

const ENTTEC_PRO_DMX_STARTCODE = 0x00
const ENTTEC_PRO_START_OF_MSG = 0x7e
const ENTTEC_PRO_END_OF_MSG = 0xe7
const ENTTEC_PRO_SEND_DMX_RQ = 0x06
// var ENTTEC_PRO_RECV_DMX_PKT = 0x05;

const DMX_SEND_INTERVAL = 1000 / 40

let _readyToWrite = true
let _connection: null | SerialPort = null
let _intervalHandle: NodeJS.Timer
let _config: Config

interface Config {
  update_ms: number
  onUpdate: (path: string | null) => void
  calculateChannels: () => number[]
}

export function maintain(config: Config) {
  _config = config
  maintainConnection()
}

async function maintainConnection() {
  if (_connection) {
    _config.onUpdate(_connection.path)
    setTimeout(maintainConnection, _config.update_ms * 5)
  } else {
    _config.onUpdate(null)
    const path = await getFirstDmxUsbProPath()
    if (path) {
      connect(path)
    }
    setTimeout(maintainConnection, _config.update_ms)
  }
}

function isDmxUsbPro(port: SerialPort.PortInfo) {
  return port.manufacturer === 'DMXking.com'
}

async function getFirstDmxUsbProPath() {
  const ports = await SerialPort.list()
  const dmxDevices = ports.filter(isDmxUsbPro)
  if (dmxDevices.length > 0) {
    return dmxDevices[0].path
  }
  return null
}

function connect(path: string) {
  _connection = new SerialPort(
    path,
    {
      baudRate: 250000,
      dataBits: 8,
      stopBits: 2,
      parity: 'none',
    },
    (err: any) => {
      if (err) {
        console.warn('Serialport connection failed', err)
        _connection = null
      } else {
        start()
      }
    }
  )
}

function start() {
  console.log('Sending DMX...')
  _intervalHandle = setInterval(() => {
    sendUniverse(_config.calculateChannels())
  }, DMX_SEND_INTERVAL)
}

// function stop() {
//   clearInterval(intervalHandle)
// }

// function close() {
//   if (connection) {
//     connection.close((err) => {
//       if (err) console.log(err)
//       else connection = null
//     })
//   }
// }

function sendUniverse(universe: number[]) {
  if (_connection?.writable && _readyToWrite) {
    const universeBuffer = Buffer.alloc(513, 0)
    universe.forEach((value, index) => (universeBuffer[index + 1] = value))

    const hdr = Buffer.from([
      ENTTEC_PRO_START_OF_MSG,
      ENTTEC_PRO_SEND_DMX_RQ,
      universeBuffer.length & 0xff,
      (universeBuffer.length >> 8) & 0xff,
      ENTTEC_PRO_DMX_STARTCODE,
    ])

    const msg = Buffer.concat([
      hdr,
      universeBuffer.slice(1),
      Buffer.from([ENTTEC_PRO_END_OF_MSG]),
    ])

    _readyToWrite = false
    _connection.write(msg)
    _connection.drain(() => {
      _readyToWrite = true
    })
  }
}
