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

export const videoExtensions = new Set(['mp4'])
export const imageExtensions = new Set(['jpg', 'jpeg'])

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: 'LocalMedia',
    paths: [],
    order: 'Random',
    objectFit: 'Cover',
    period: 2,
  }
}
