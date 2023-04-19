import * as THREE from 'three'
import { FontType } from '../fonts/FontType'
import LayerBase from './LayerBase'
import { particles } from '../util/particles'
import { textOutlineShapesAndHoles, textBounds } from '../util/text'
import { colorFromHSV, distance } from '../util/util'
import { lerp, randomRanged } from '../../../utils/math/util'
import { gravity, ParticleState } from '../util/particlePhysics'
import { TextParticlesConfig } from './TextParticlesConfig'
import shaders from '../shaders/shaders'
import UpdateResource from '../UpdateResource'
import { mapFn } from '../../../utils/util'
import { snapToMultipleOf2 } from '../util/util'
import { rLerp } from 'features/utils/math/range'

const attrib = {
  position: 'position',
  color: 'customColor',
  size: 'size',
}

const mapSpeedToPeriod = mapFn(0.3, { min: 16, max: 0.125 })
const mapSnapToExp = mapFn(2, { min: 1.5, max: 0.2 })

export default class TextParticles extends LayerBase {
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
      vertexShader: shaders.particles.vertex,
      fragmentShader: shaders.particles.fragment,
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
    this.releaseParticles()
    this.createParticles()
  }

  update(res: UpdateResource): void {
    const { params } = res
    const pos = this.particles.geometry.attributes.position
    const color = this.particles.geometry.attributes.customColor
    const size = this.particles.geometry.attributes.size
    if (pos === undefined) return

    const period = snapToMultipleOf2(
      mapSpeedToPeriod(rLerp(this.config.speed, res.scene.epicness))
    )

    const col = new THREE.Color(
      colorFromHSV(res.params.hue ?? 0.0, 1, params.brightness ?? 0.0)
    )

    if (res.isNewPeriod(period)) {
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
        pState.tx = points[i]?.x ?? 0
        pState.ty = points[i]?.y ?? 0
      })
    }

    const dt_seconds = res.dt / 1000

    res.msPerPeriod(period)
    const framesLeft = res.framesLeft(period)
    const exp = mapSnapToExp(res.lerpEpicness(this.config.snap))
    const amount = Math.min(1 / framesLeft, 1) ** exp

    this.particleStates.forEach((pState, i) => {
      let { x, y, tx, ty, vx, vy } = gravity(
        dt_seconds,
        pState,
        this.config.physics
      )

      // Pull towards target as we near the end of the period
      x = lerp(x, tx, amount)
      y = lerp(y, ty, amount)

      const dist = distance(x, y, tx, ty)

      pos.setXY(i, x, y)
      size.setX(
        i,
        ((1 + dist * 5) * this.config.particleSize * res.size.height) / 2000
      )
      color.setXYZ(i, col.r, col.g, col.b)

      pState.x = x
      pState.y = y
      pState.vx = vx
      pState.vy = vy
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
        tx: x,
        ty: y,
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
