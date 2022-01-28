import * as THREE from 'three'
import { FontType } from './fonts'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import shaders from './shaders'
import { particles } from './particles'
import { textOutlineShapesAndHoles, textBounds } from './text'
import { colorFromHSV, distance } from './animations'
import { isNewPeriod } from '../../engine/TimeState'
import { random } from 'util/util'
import { gravity, ParticleState, Physics } from './particlePhysics'

const attrib = {
  position: 'position',
  color: 'customColor',
  size: 'size',
}

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
    particleSize: 0.1,
    particleCount: 10000,
    physics: {
      type: 'gravity',
      gravity: 15,
      drag: 3,
    },
    throwVelocity: 0.5,
  }
}

export default class TextParticles extends VisualizerBase {
  particleTexture = particles.circle
  particles = new THREE.Points()
  particleStates: ParticleState[] = []
  config: TextParticlesConfig
  planeArea: THREE.Mesh
  planeGeometry: THREE.PlaneGeometry
  activeTextIndex = 0

  constructor(config: TextParticlesConfig) {
    super()
    this.config = config
    this.planeGeometry = new THREE.PlaneGeometry()
    const material = new THREE.MeshBasicMaterial()
    this.planeArea = new THREE.Mesh(this.planeGeometry, material)
    this.planeArea.visible = false
    this.scene.add(this.planeArea)
  }

  resize(width: number, height: number): void {
    super.resize(width, height)
    const size = this.visibleSizeAtZ(0)
    this.planeArea.geometry = new THREE.PlaneGeometry(size.width, size.height)
    this.createParticles()
  }

  update(dt: number, { time, params }: UpdateResource): void {
    const pos = this.particles.geometry.attributes.position
    const color = this.particles.geometry.attributes.customColor
    const size = this.particles.geometry.attributes.size
    if (pos === undefined) return

    const col = new THREE.Color(colorFromHSV(params.hue, 1, params.brightness))

    if (isNewPeriod(time, 8)) {
      const { text, textSize, fontType, particleCount } = this.config
      this.activeTextIndex += 1
      if (this.activeTextIndex >= text.length) this.activeTextIndex = 0
      const points = getShapePoints(
        text[this.activeTextIndex],
        textSize,
        particleCount,
        fontType
      )
      console.log('point.length', points.length)
      this.particleStates.forEach((pState, i) => {
        pState.ix = points[i]?.x ?? 0
        pState.iy = points[i]?.y ?? 0
        // pState.vx = this.throw()
        // pState.vy = this.throw()
      })
    }

    const dt_seconds = dt / 1000

    this.particleStates.forEach((pState, i) => {
      const { x, y, ix, iy, vx, vy } = gravity(
        dt_seconds,
        pState,
        this.config.physics
      )
      pState.x = x
      pState.y = y
      pState.vx = vx
      pState.vy = vy
      const delta = distance(x, y, ix, iy)

      pos.setXY(i, x, y)
      size.setX(i, delta + this.config.particleSize)
      color.setXYZ(i, col.r, col.g, col.b)
    })

    pos.needsUpdate = true
    color.needsUpdate = true
    size.needsUpdate = true
  }

  createParticles() {
    const { text, textSize, fontType, particleCount, particleSize } =
      this.config
    const points = getShapePoints(text[0], textSize, particleCount, fontType)

    let colors: number[] = []
    let sizes: number[] = []

    points.forEach(({ x, y }) => {
      colors.push(1, 1, 1)
      sizes.push(particleSize)
      this.particleStates.push({
        x: x,
        y: y,
        ix: x,
        iy: y,
        vx: 0,
        vy: 0,
      })
    })

    let geoParticles = new THREE.BufferGeometry().setFromPoints(points)

    geoParticles.setAttribute(
      attrib.color,
      new THREE.Float32BufferAttribute(colors, 3)
    )
    geoParticles.setAttribute(
      attrib.size,
      new THREE.Float32BufferAttribute(sizes, 1)
    )

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        pointTexture: { value: this.particleTexture },
      },
      vertexShader: shaders.particleVertex,
      fragmentShader: shaders.particleFragment,

      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    })

    this.particles = new THREE.Points(geoParticles, material)
    this.scene.add(this.particles)
  }

  throw() {
    return random(-this.config.throwVelocity, this.config.throwVelocity)
  }

  // createRenderer() {
  //   this.renderer.outputEncoding = THREE.sRGBEncoding
  // }
}

function particlesPerPath(
  particleCount: number,
  paths: Array<THREE.Shape | THREE.Path>
) {
  const totalLength = paths.reduce((accum, path) => accum + path.getLength(), 0)

  let usedParticles = 0
  const ret: number[] = []
  for (let i = 0; i < paths.length - 1; i++) {
    const path = paths[i]
    const particles = (path.getLength() / totalLength) * particleCount
    ret.push(particles)
    usedParticles += particles
  }
  const remaining = particleCount - usedParticles
  ret.push(remaining)
  return ret
}

function getShapePoints(
  text: string,
  textSize: number,
  pointCount: number,
  fontType: FontType
) {
  let { shapes } = textOutlineShapesAndHoles(text, textSize, fontType)

  let points: THREE.Vector3[] = []

  const { width, height } = textBounds(text, textSize, fontType)
  const xOffset = -width / 2
  const yOffset = height / 2

  const particleCounts = particlesPerPath(pointCount, shapes)

  shapes.forEach((shape, i) => {
    let shapePoints = shape.getSpacedPoints(particleCounts[i])
    shapePoints.forEach(({ x, y }) => {
      x += xOffset
      y += yOffset
      const point = new THREE.Vector3(x, y, 0)
      points.push(point)
    })
  })
  return points
}
