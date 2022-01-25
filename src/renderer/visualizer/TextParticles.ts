import * as THREE from 'three'
import { Font, FontType, fonts } from './fonts'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import shaders from './shaders'
import { particles } from './particles'
import { textOutlineShapesAndHoles } from './text'
import { colorFromHSV, distance } from './animations'
import { isNewPeriod } from '../../engine/TimeState'
import { random, randomElement } from 'util/util'
import { gravity, ParticleState, Physics } from './particlePhysics'

const attrib = {
  position: 'position',
  color: 'customColor',
  size: 'size',
}

interface Config {
  text: string
  textSize: number
  fontType: FontType
  particlesPerLetter: number
  particleSize: number
  particleColor: number
  physics: Physics
  throwVelocity: number
}

export default class TextParticles extends VisualizerBase {
  readonly type = 'TextParticles'
  particleTexture = particles.circle
  particles = new THREE.Points()
  particleStates: ParticleState[] = []
  config: Config
  planeArea: THREE.Mesh
  planeGeometry: THREE.PlaneGeometry

  constructor(config: Config) {
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

  update({ time, params }: UpdateResource): void {
    const pos = this.particles.geometry.attributes.position
    const color = this.particles.geometry.attributes.customColor
    const size = this.particles.geometry.attributes.size
    if (pos === undefined) return

    const col = new THREE.Color(
      colorFromHSV(params.hue, params.saturation, params.brightness)
    )

    if (isNewPeriod(time, 16)) {
      console.log('NEW PERIOD')
      this.particleStates.forEach((pState) => {
        pState.x = pState.ix
        pState.y = pState.iy
        pState.vx = this.throw()
        pState.vy = this.throw()
      })
    }

    const dt_seconds = time.dt / 1000

    this.particleStates.forEach((pState, i) => {
      const { x, y, ix, iy, vx, vy } = gravity(
        dt_seconds,
        pState,
        this.config.physics,
        i === 0
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
    const { text, textSize, fontType, particlesPerLetter, particleSize } =
      this.config
    let { shapes, holes } = textOutlineShapesAndHoles(text, textSize, fontType)

    // Prep shader attributes
    let points: THREE.Vector3[] = []
    let colors: number[] = []
    let sizes: number[] = []

    for (const shape of shapes) {
      const particleCount = shape.getLength() * particlesPerLetter
      let shapePoints = shape.getSpacedPoints(particleCount)
      shapePoints.forEach(({ x, y }) => {
        const point = new THREE.Vector3(x, y, 0)
        points.push(point)
        this.particleStates.push({
          x: x,
          y: y,
          ix: x,
          iy: y,
          vx: this.throw(),
          vy: this.throw(),
        })
        colors.push(1, 1, 1)
        sizes.push(particleSize)
      })
    }

    const geo = new THREE.ShapeGeometry(shapes)
    geo.computeBoundingBox()
    geo.center()
    const bb = geo.boundingBox
    let x_offset = 0
    let y_offset = 0
    if (bb) {
      x_offset = -(bb.max.x - bb.min.x) / 2
      y_offset = (bb.max.y - bb.min.y) / 4
    }

    let geoParticles = new THREE.BufferGeometry().setFromPoints(points)
    geoParticles.translate(x_offset, y_offset, 0)

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
