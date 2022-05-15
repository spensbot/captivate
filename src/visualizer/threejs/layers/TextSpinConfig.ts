export interface TextSpinConfig {
  type: 'TextSpin'
  size: number
  text: string
}

export function initTextSpinConfig(): TextSpinConfig {
  return {
    type: 'TextSpin',
    size: 1,
    text: 'FEEL\nWITH\nME',
  }
}
