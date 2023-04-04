import { BaseColors } from '../../../shared/baseColors'
import { MAX_LED_COUNT } from '../../../features/led/shared/ledFixtures'

const MAX_VAL = 255

// All inputs should be from 0 to 255
export default function udpBuffer(colors: BaseColors[]) {
  // https://github.com/Aircoookie/WLED/wiki/UDP-Realtime-Control
  // byte 0 = 3 (DRGBW protocol. 367 LEDs max)
  // byte 1 = seconds to wait after last packet to return to normal
  // Byte	Description
  //   2 + n*4	Red Value
  //   3 + n*4	Green Value
  //   4 + n*4	Blue Value
  //   5 + n*4	White Value

  let buffer = Buffer.alloc(MAX_LED_COUNT * 4 + 2, 0)

  buffer[0] = 3
  buffer[1] = 2

  for (let [i, { red, green, blue }] of colors.entries()) {
    if (i < MAX_LED_COUNT) {
      let white = Math.min(red, green, blue)

      buffer[2 + i * 4] = red * MAX_VAL
      buffer[3 + i * 4] = green * MAX_VAL
      buffer[4 + i * 4] = blue * MAX_VAL
      buffer[5 + i * 4] = white * MAX_VAL
    }
  }

  if (colors.length > MAX_LED_COUNT) {
    console.warn('MAX_LED_COUNT exceeded. Extra values ignored')
  }

  return buffer
}
