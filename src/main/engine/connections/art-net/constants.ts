export const DMX_PERIOD_MS = 1000 / 44
export const ARTNET_PORT = 0x1936
export const LOCALHOST_IP = '127.0.0.1'
export const POLL_PERIOD_MS = 2700 // .Art-Net requires that all controllers broadcast an ArtPoll every 2.5 to 3 seconds
export const REPLY_DELAY_MAX_MS = 1000
export const PRIMARY_ARTNET_IP = '2.255.255.255'
export const SECONDARY_ARTNET_IP = '10.255.255.255'
export function replyDelayMs(): number {
  return Math.random() * REPLY_DELAY_MAX_MS
}
