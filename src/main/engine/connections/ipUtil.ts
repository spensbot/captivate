import { isIPv4 } from 'net'
import * as addr from 'address'

export let thisIpString: string | null = addr.ip() ?? null
export let thisIpBuffer: Buffer | null = toIpBuffer(thisIpString ?? '')

export function toIpBuffer(ipString: string): Buffer | null {
  if (!isIPv4(ipString)) return null

  const octets = ipString.split('.').map((part) => Number.parseInt(part, 10))
  if (
    octets.length !== 4 ||
    octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return null
  }

  return Buffer.from(octets)
}

export let thisMacString: string | null = null
export let thisMacBuffer: Buffer | null = null

addr.mac((err, val) => {
  if (val) {
    thisMacString = val
    thisMacBuffer = toMacBuffer(thisMacString)
  }
  if (err) {
    console.error('Error getting mac', err)
  }
})

export function toMacBuffer(macString: string): Buffer | null {
  const hex = macString.split(':')
  try {
    if (hex.length === 6) {
      return Buffer.from(hex.map((h) => Number('0x' + h)))
    }
  } catch {}
  return null
}