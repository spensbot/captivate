import { Physics } from './particlePhysics'
import { FontType } from './FontType'

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
}

export function initTextParticlesConfig(): TextParticlesConfig {
  return {
    type: 'TextParticles',
    text: [
      'CAPTIVATE',
      'YOUR',
      'AUDIENCE',
      'BE\nHERE\nNOW',
      'FEEL',
      'WITH',
      'ME',
      'FEEL\nWITH\nME',
      "IT's\nOK",
    ],
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
  }
}
