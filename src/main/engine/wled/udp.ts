import dgram from 'node:dgram'
import { Buffer } from 'node:buffer'

const WLED_PORT = 21324
const DEVICE_IP = '192.168.0.178'

// All inputs should be from 0 to 255
function buffer(rgbw_values: [number, number, number, number][]) {
  // https://github.com/Aircoookie/WLED/wiki/UDP-Realtime-Control
  // byte 0 = 3 (DRGBW protocol. 367 LEDs max)
  // byte 1 = seconds to wait after last packet to return to normal
  // Byte	Description
  //   2 + n*4	Red Value
  //   3 + n*4	Green Value
  //   4 + n*4	Blue Value
  //   5 + n*4	White Value

  let buffer = Buffer.alloc(367 * 4 + 2, 0)

  buffer[0] = 3
  buffer[1] = 2

  for (let [i, [r, g, b, w]] of rgbw_values.entries()) {
    buffer[2 + i * 4] = r
    buffer[3 + i * 4] = g
    buffer[4 + i * 4] = b
    buffer[5 + i * 4] = w
  }

  return buffer
}

const client = dgram.createSocket('udp4')

setInterval(() => {
  console.log('UDP Send')
  try {
    client.send(
      buffer(
        Array(367)
          .fill(0)
          .map((_) => [0, 255, 0, 0])
      ),
      WLED_PORT,
      DEVICE_IP,
      (err) => {
        if (err) {
          console.log('UDP Send Error\n', err)
        }
      }
    )
  } catch (err) {
    console.log('UDP Send Error 2\n', err)
  }
}, 1000)
