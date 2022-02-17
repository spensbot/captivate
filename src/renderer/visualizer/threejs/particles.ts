import * as THREE from 'three'
import particleSrc from '../../images/particle.png'
import { TextureLoader } from 'three'

const _start = Date.now()

export const particles = {
  circle: new THREE.Texture(),
}

const loadingManager = new THREE.LoadingManager()
loadingManager.onLoad = () => {
  console.log(`Particles loaded in ${Date.now() - _start}ms`)
}

particles.circle = new TextureLoader(loadingManager).load(particleSrc)

export type Particle = THREE.Texture

export type ParticleType = keyof typeof particles

//@ts-ignore: I know this works, but I'm not sure how to prove that to TS?
export const particleTypes: ParticleType[] = Array.from(Object.keys(particles))
