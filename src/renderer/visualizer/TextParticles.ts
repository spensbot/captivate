import * as THREE from 'three'
import { Font, FontType, fonts } from './fonts'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import shaders from './shaders'
import { particles } from './particles'
import { textOutlineShapesAndHoles } from './text'

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

  update({ time }: UpdateResource): void {
    // console.log(this.particles.geometry.attributes)
    // console.log(this.particles.geometry.attributes.position)
    // console.log(this.particles.geometry.attributes.customColor)
    // console.log(this.particles.geometry.attributes.size)
    // const pos = this.particles.geometry.attributes.position
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
      let shapePoints = shape.getSpacedPoints(particlesPerLetter)
      shapePoints.forEach((shapePoint) => {
        const point = new THREE.Vector3(shapePoint.x, shapePoint.y, 0)
        points.push(point)
        colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b)
        sizes.push(particleSize)
      })
    }

    let geoParticles = new THREE.BufferGeometry().setFromPoints(points)
    // TODO
    // geoParticles.translate(xMid, yMid, 0)

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

    this.geometryCopy = new THREE.BufferGeometry()
    this.geometryCopy.copy(this.particles.geometry)
  }

  // createRenderer() {
  //   this.renderer.outputEncoding = THREE.sRGBEncoding
  // }
}
