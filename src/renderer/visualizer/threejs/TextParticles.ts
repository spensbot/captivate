import * as THREE from 'three'
import { FontType } from './FontType'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import shaders from './shaders'
import { particles } from './particles'
import { textOutlineShapesAndHoles, textBounds } from './text'
import { colorFromHSV, distance } from './util'
import { randomRanged } from '../../../shared/util'
import { gravity, ParticleState } from './particlePhysics'
import { TextParticlesConfig } from './TextParticlesConfig'

const attrib = {
  position: 'position',
  color: 'customColor',
  size: 'size',
}

export default class TextParticles extends VisualizerBase {
  particles = new THREE.Points()
  particleStates: ParticleState[] = []
  config: TextParticlesConfig
  material: THREE.ShaderMaterial
  planeArea: THREE.Mesh
  planeGeometry: THREE.PlaneGeometry
  activeTextIndex = 0

  constructor(config: TextParticlesConfig) {
    super()
    this.config = config
    this.planeGeometry = new THREE.PlaneGeometry()
    const material = new THREE.MeshBasicMaterial()
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        pointTexture: { value: particles.circle },
      },
      vertexShader: shaders.particleVertex,
      fragmentShader: shaders.particleFragment,

      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    })
    this.planeArea = new THREE.Mesh(this.planeGeometry, material)
    this.planeArea.visible = false
    this.scene.add(this.planeArea)
  }

  resize(width: number, height: number): void {
    super.resize(width, height)
    const size = this.visibleSizeAtZ(0)
    this.planeArea.geometry = new THREE.PlaneGeometry(size.width, size.height)
    this.scene.clear()
    this.particles.geometry.dispose()
    this.createParticles()
  }

  update(dt: number, res: UpdateResource): void {
    const { params } = res
    const pos = this.particles.geometry.attributes.position
    const color = this.particles.geometry.attributes.customColor
    const size = this.particles.geometry.attributes.size
    if (pos === undefined) return

    const col = new THREE.Color(
      colorFromHSV(res.params.hue, 1, params.brightness)
    )

    if (res.isNewPeriod(8)) {
      const { text, textSize, fontType, particleCount } = this.config
      this.activeTextIndex += 1
      if (this.activeTextIndex >= text.length) this.activeTextIndex = 0
      const points = getShapePoints(
        text[this.activeTextIndex],
        textSize,
        particleCount,
        fontType
      )
      this.particleStates.forEach((pState, i) => {
        pState.ix = points[i]?.x ?? 0
        pState.iy = points[i]?.y ?? 0
      })
    } else if (res.isNewPeriod(1)) {
      // this.particleStates.forEach((pState, i) => {
      // pState.vx += this.throw()
      // pState.vy += this.throw()
      // })
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

    this.material.needsUpdate = true
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

    this.particles = new THREE.Points(geoParticles, this.material)
    this.scene.add(this.particles)
  }

  releaseParticles() {
    this.material.dispose()
  }

  throw() {
    return randomRanged(-this.config.throwVelocity, this.config.throwVelocity)
  }

  dispose() {
    this.particles.geometry.dispose()
    this.material.dispose()
    this.planeGeometry.dispose()
  }
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
