import { Physics } from '../util/particlePhysics'
import { FontType } from '../fonts/FontType'
import { Range } from 'features/utils/math/range'

export interface TextParticlesConfig {
  type: 'TextParticles'
  text: string[]
  textSize: number
  fontType: FontType
  particleCount: number
  particleSize: number
  particleColor: number
  physics: Physics
  throwVelocity: number
  speed: Range
  snap: Range
}

export function initTextParticlesConfig(): TextParticlesConfig {
  return {
    type: 'TextParticles',
    text: ['CAPTIVATE', 'YOUR', 'AUDIENCE'],
    fontType: 'helvetiker_bold',
    textSize: 1.5,
    particleColor: 0xffffff,
    particleSize: 0.15,
    particleCount: 15000,
    physics: {
      type: 'gravity',
      gravity: 20,
      drag: 3,
    },
    throwVelocity: 0.5,
    speed: { min: 0, max: 0.7 },
    snap: { min: 0.2, max: 0.8 },
  }
}
