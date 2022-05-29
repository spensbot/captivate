export interface TextSpinConfig {
  type: 'TextSpin'
  size: number
  text: string
}

export function initTextSpinConfig(): TextSpinConfig {
  return {
    type: 'TextSpin',
    size: 0.5,
    text: 'FEEL\nWITH\nME',
  }
}
