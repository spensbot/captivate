import * as THREE from 'three'
import particleSrc from '../../../images/particle.png'
import { TextureLoader } from 'three'

export const particles = {
  circle: new THREE.Texture(),
}

const loadingManager = new THREE.LoadingManager()
loadingManager.onLoad = () => {}

particles.circle = new TextureLoader(loadingManager).load(particleSrc)

export type Particle = THREE.Texture

export type ParticleType = keyof typeof particles

//@ts-ignore: I know this works, but I'm not sure how to prove that to TS?
export const particleTypes: ParticleType[] = Array.from(Object.keys(particles))
