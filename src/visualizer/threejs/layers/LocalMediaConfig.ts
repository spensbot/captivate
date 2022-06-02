export type OrderType = 'Random' | 'Ordered'
export const orderTypes: OrderType[] = ['Ordered', 'Random']

export type ObjectFit = 'Cover' | 'Fit'
export const objectFits: ObjectFit[] = ['Cover', 'Fit']

export interface LocalMediaConfig {
  type: 'LocalMedia'
  order: OrderType
  objectFit: ObjectFit
  paths: string[]
  period: number
}

export const videoExtensions: readonly string[] = [
  'mkv',
  'avi',
  'mp4',
  'mov',
  'webm',
  'ogg',
]
export const imageExtensions: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'svg',
]

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: 'LocalMedia',
    paths: [],
    order: 'Random',
    objectFit: 'Cover',
    period: 2,
  }
}
