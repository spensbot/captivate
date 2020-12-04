//Much of this code is adapted from: https://github.com/node-dmx/dmx

const serialport = window.require('serialport');
import "regenerator-runtime";
import SerialPort from "serialport";

const ENTTEC_PRO_DMX_STARTCODE = 0x00;
const ENTTEC_PRO_START_OF_MSG = 0x7e;
const ENTTEC_PRO_END_OF_MSG = 0xe7;
const ENTTEC_PRO_SEND_DMX_RQ = 0x06;
// var ENTTEC_PRO_RECV_DMX_PKT = 0x05;

type u8 = number

const interval = 1000 / 40;

const universe = Buffer.alloc(513, 0);

let readyToWrite = true;
let connection: null | SerialPort = null;
let intervalHandle: number

function isDmxUsbPro(port: SerialPort.PortInfo) {
  return port.manufacturer === "DMXking.com"
}

async function getFirstDmxUsbProPath() {
  const ports = await serialport.list()
  const dmxDevices = ports.filter(isDmxUsbPro)
  if (dmxDevices.length > 0) {
    return dmxDevices[0].path
  }
  return null
}

export async function maintainConnection() {
  if (connection) {
    setTimeout(maintainConnection, 5000)
    return
  }

  const path = await getFirstDmxUsbProPath()
  if (path) {
    connect(path)
    console.log(`Connected to device at path: ${path}`);
  }

  setTimeout(maintainConnection, 2000)
}

function connect(path: String) {
  connection = new serialport(
    path,
    {
      baudRate: 250000,
      dataBits: 8,
      stopBits: 2,
      parity: 'none',
    },
    (err: any) => {
      if (err) {
        console.warn("Serialport connection failed", err)
        connection = null
      } else {
        start()
      }
    }
  )
}

function start() {
  console.log("Sending DMX...")
  intervalHandle = setInterval(() => {
    sendUniverse()
  }, interval)
}

function stop() {
  clearInterval(intervalHandle)
}

function close() {
  if (connection){
    connection.close(err => {
      if (err) console.log(err)
      else connection = null
    })
  }
}

export function updateAll(values: u8[]) {
  values.forEach( (value, index) => {
    universe[index] = value
  })
}

export function updateChannel(channel: number, value: u8) {
  universe[channel] = value
}

function sendUniverse() {
  if (!connection) return
  if (!connection.writable) return

  if (readyToWrite) {
    const hdr = Buffer.from([
      ENTTEC_PRO_START_OF_MSG,
      ENTTEC_PRO_SEND_DMX_RQ,
      universe.length & 0xff,
      (universe.length >> 8) & 0xff,
      ENTTEC_PRO_DMX_STARTCODE,
    ]);

    const msg = Buffer.concat([
      hdr,
      universe.slice(1),
      Buffer.from([ENTTEC_PRO_END_OF_MSG]),
    ]);

    readyToWrite = false;
    connection.write(msg);
    connection.drain(() => {
      readyToWrite = true;
    });
  }
}
