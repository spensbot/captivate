//Much of this code is adapted from: https://github.com/node-dmx/dmx

import { SerialPort } from 'serialport'
import {
  DmxConnections,
  ConnectionId,
  DmxDevice_t,
  SerialportInfo,
} from '../../devices/shared/connection'

const ENTTEC_PRO_DMX_STARTCODE = 0x00
const ENTTEC_PRO_START_OF_MSG = 0x7e
const ENTTEC_PRO_END_OF_MSG = 0xe7
const ENTTEC_PRO_SEND_DMX_RQ = 0x06
// var ENTTEC_PRO_RECV_DMX_PKT = 0x05;

const DMX_SEND_INTERVAL = 1000 / 40

let _readyToWrite = true
let _connection: null | SerialPort = null
let _config: Config
let maintainTimeout: NodeJS.Timer | undefined

const supportedDMXDevices = ['DMX', 'ENTTEC', 'FTDI']

export type UpdatePayload = DmxConnections

interface Config {
  update_ms: number
  onUpdate: (path: UpdatePayload) => void
  getChannels: () => number[]
  getConnectable: () => ConnectionId[]
}

function getConnectionId(port: SerialportInfo): ConnectionId {
  return port.path
}

function getDeviceName(port: SerialportInfo): ConnectionId {
  if (port.manufacturer === 'FTDI') {
    return 'DMX USB Device'
  } else {
    return port.manufacturer || 'undefined'
  }
}

function dmxDevice(port: SerialportInfo): DmxDevice_t {
  return {
    connectionId: getConnectionId(port),
    path: port.path,
    manufacturer: port.manufacturer,
    pnpId: port.pnpId,
    productId: port.productId,
    serialNumber: port.serialNumber,
    vendorId: port.vendorId,
    name: getDeviceName(port),
  }
}

export function maintain(config: Config) {
  _config = config
  maintainConnection()
  const interval = setInterval(() => {
    sendUniverse(_config.getChannels())
  }, DMX_SEND_INTERVAL)

  return {
    dispose() {
      clearInterval(interval)
      close()
      if (maintainTimeout) clearTimeout(maintainTimeout)
    },
  }
}

export function listPorts(): Promise<SerialportInfo[]> {
  return SerialPort.list()
}

function close() {
  _connection?.close()
  _connection?.destroy()
  _connection = null
}

async function maintainConnection() {
  const availablePorts = await SerialPort.list()

  const availableDevices = availablePorts
    .filter((p) => isDmxDevice_t(p))
    .map((p) => dmxDevice(p))
  const connectable = _config.getConnectable()

  if (_connection !== null) {
    if (
      !connectable.find((c) => c === _connection?.path) ||
      !_connection.isOpen
    ) {
      close()
    }
  } else {
    const portToConnect = availablePorts.find(
      (port) => connectable.find((c) => c === port.path) !== undefined
    )
    if (portToConnect) {
      connect(portToConnect.path)
    }
  }

  let status: DmxConnections = {
    connected: _connection ? [_connection.path] : [],
    available: availableDevices,
    serialports: availablePorts,
  }

  _config.onUpdate(status)

  maintainTimeout = setTimeout(maintainConnection, _config.update_ms)
}

function connect(path: string) {
  _connection = new SerialPort(
    {
      path,
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
  _connection.on('disconnect', (_d) => {})
  _connection.on('error', (e) => {
    console.error('Error', e)
  })
}

function start() {}

function isDmxDevice_t(port: SerialportInfo) {
  if (
    supportedDMXDevices.some((manufacturerName) =>
      port.manufacturer?.includes(manufacturerName)
    )
  )
    return true
  return false
}

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
