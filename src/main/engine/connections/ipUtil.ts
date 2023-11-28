import * as ip from 'ip'
import * as addr from 'address'

export let thisIpString: string | null = addr.ip() ?? null
export let thisIpBuffer: Buffer | null = null

export function toIpBuffer(ipString: string): Buffer | null {
  try {
    return ip.toBuffer(ipString)
  } catch {
    return null
  }
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
