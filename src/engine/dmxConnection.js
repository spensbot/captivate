// const serialport = require('serialport')
const serialport = window.require('serialport');
import regeneratorRuntime from "regenerator-runtime";

const ENTTEC_PRO_DMX_STARTCODE = 0x00;
const ENTTEC_PRO_START_OF_MSG = 0x7e;
const ENTTEC_PRO_END_OF_MSG = 0xe7;
const ENTTEC_PRO_SEND_DMX_RQ = 0x06;
// var ENTTEC_PRO_RECV_DMX_PKT = 0x05;

const interval = 1000 / 40;

const universe = Buffer.alloc(513, 0);

let readyToWrite = true;
let connection = null;
let intervalHandle;

function isDmxUsbPro(port) {
  return port.manufacturer === "DMXking.com"
}

async function getFirstDmxUsbProPath() {
  serialport.list().then(ports => {
    console.log(ports)
    const dmxDevices = ports.filter(isDmxUsbPro)
    console.log(dmxDevices)
    if (dmxDevices.length > 0) {
      return dmxDevices[0].path
    }
    return null
  }).catch(err => {
    console.log(err)
    return null
  }).finally()
}

export async function maintainConnection() {
  console.log("Connection", connection)

  if (connection) {
    setTimeout(maintainConnection, 5000)
    return
  }

  getFirstDmxUsbProPath().then(path => {
    console.log(path)
    connect("/dev/tty.usbserial-6A1UGL5M")
    // connect(path)
  })

  setTimeout(maintainConnection, 2000)
}

function connect(path) {
  if (path) {
    connection = new serialport(
      path,
      {
        baudRate: 250000,
        dataBits: 8,
        stopBits: 2,
        parity: 'none',
      },
      (err) => {
        if (err) {
          console.warn("Serialport connection failed", err)
          connection = null
        } else {
          start()
        }
      }
    )
  }
}

function start() {
  console.log("Sending DMX")
  intervalHandle = setInterval(() => {
    sendUniverse()
  }, interval)
}

function stop() {
  clearInterval(intervalHandle)
}

function close() {
  connection.close(err => {
    if (err) console.log(err)
    else connection = null
  })
}

export function update(u) {
  for (const c in u) {
    this.universe[c] = u[c];
  }
}

function sendUniverse() {
  if (!connection.writable) {
    return
  }
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
