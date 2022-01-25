import * as THREE from 'three'
import { Font, FontType, fonts } from './fonts'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import shaders from './shaders'
import { particles } from './particles'
import { textOutlineShapesAndHoles } from './text'
import { colorFromHSV, distance } from './animations'
import { isNewPeriod } from '../../engine/TimeState'
import { random } from 'util/util'

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
}

export default class TextParticles extends VisualizerBase {
  readonly type = 'TextParticles'
  particle = particles.circle
  particles = new THREE.Points()
  startPoints: THREE.Vector3[] = []
  geometryCopy = new THREE.BufferGeometry()
  raycaster = new THREE.Raycaster()
  colorChange = new THREE.Color()
  buttom = false
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

    const d = time.beats / 2.0

    const c = d % 1.0
    console.log(c)
    const col = new THREE.Color(
      colorFromHSV(params.hue, params.saturation, params.brightness)
    )

    let ease = time.dt / 5000

    this.startPoints.forEach((init, i) => {
      const x = pos.getX(i)
      const y = pos.getY(i)
      if (isNewPeriod(time, 1)) {
        pos.setXY(i, init.x + random(-0.2, 0.2), init.y + random(-0.2, 0.2))
      } else {
        let dx = init.x - x
        let dy = init.y - y
        dx = dx < ease ? dx : ease
        dy = dy < ease ? dy : ease
        pos.setXY(i, x + dx, y + dy)
      }
      const delta = distance(init.x, init.y, x, y)
      size.setX(i, delta + this.config.particleSize)

      color.setXYZ(i, col.r, col.g, col.b)
    })
    pos.needsUpdate = true
    color.needsUpdate = true
    size.needsUpdate = true
    // const startPos =
    // if (pos === undefined) return
    // for (let i = 0; i < pos.count; i++) {
    //   pos.setXYZ(i, , , pos.getZ(i) + 0.01)
    // }
    // this.planeArea.rotation.x = time.beats
    // const pos = this.particles.geometry.attributes.position
    // const copy = this.geometryCopy.attributes.poisiton
    // const colours = this.particles.geometry.
    // pos.
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
      shapePoints.forEach((shapePoint) => {
        const point = new THREE.Vector3(shapePoint.x, shapePoint.y, 0)
        points.push(point)
        this.startPoints.push(point.clone())
        colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b)
        sizes.push(particleSize)
      })
    }

    const geo = new THREE.ShapeGeometry(shapes)
    geo.computeBoundingBox()
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
        pointTexture: { value: this.particle },
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

  // createRenderer() {
  //   this.renderer.outputEncoding = THREE.sRGBEncoding
  // }
}
