import { Physics } from '../util/particlePhysics'
import { FontType } from '../fonts/FontType'

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
  period: number
}

export function initTextParticlesConfig(): TextParticlesConfig {
  return {
    type: 'TextParticles',
    text: ['CAPTIVATE', 'YOUR', 'AUDIENCE'],
    fontType: 'zsd',
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
    period: 8,
  }
}
