const preload = () => {
  let manager = new THREE.LoadingManager()
  manager.onLoad = function () {
    const environment = new Environment(typo, particle)
  }

  var typo = null
  const loader = new THREE.FontLoader(manager)
  const font = loader.load(
    'https://res.cloudinary.com/dydre7amr/raw/upload/v1612950355/font_zsd4dr.json',
    function (font) {
      typo = font
    }
  )
  const particle = new THREE.TextureLoader(manager).load(
    'https://res.cloudinary.com/dfvtkoboz/image/upload/v1605013866/particle_a64uzf.png'
  )
}

if (
  document.readyState === 'complete' ||
  (document.readyState !== 'loading' && !document.documentElement.doScroll)
)
  preload()
else document.addEventListener('DOMContentLoaded', preload)

class Environment {
  constructor(font, particle) {
    this.font = font
    this.particle = particle
    this.container = document.querySelector('#magic')
    this.scene = new THREE.Scene()
    this.createCamera()
    this.createRenderer()
    this.setup()
    this.bindEvents()
  }

  bindEvents() {
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  setup() {
    this.createParticles = new CreateParticles(
      this.scene,
      this.font,
      this.particle,
      this.camera,
      this.renderer
    )
  }

  render() {
    this.createParticles.render()
    this.renderer.render(this.scene, this.camera)
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      1,
      10000
    )
    this.camera.position.set(0, 0, 100)
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    )

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.container.appendChild(this.renderer.domElement)

    this.renderer.setAnimationLoop(() => {
      this.render()
    })
  }

  onWindowResize() {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    )
  }
}

class CreateParticles {
  constructor(scene, font, particleImg, camera, renderer) {
    this.scene = scene
    this.font = font
    this.particleImg = particleImg
    this.camera = camera
    this.renderer = renderer

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2(-200, 200)

    this.colorChange = new THREE.Color()

    this.buttom = false

    this.data = {
      text: 'FUTURE\nIS NOW',
      amount: 1500,
      particleSize: 1,
      particleColor: 0xffffff,
      textSize: 16,
      area: 250,
      ease: 0.05,
    }

    this.setup()
    this.bindEvents()
  }

  setup() {
    const geometry = new THREE.PlaneGeometry(
      this.visibleWidthAtZDepth(100, this.camera),
      this.visibleHeightAtZDepth(100, this.camera)
    )
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
    })
    this.planeArea = new THREE.Mesh(geometry, material)
    this.planeArea.visible = false
    this.createText()
  }

  bindEvents() {
    document.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  onMouseDown() {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
    vector.unproject(this.camera)
    const dir = vector.sub(this.camera.position).normalize()
    const distance = -this.camera.position.z / dir.z
    this.currenPosition = this.camera.position
      .clone()
      .add(dir.multiplyScalar(distance))

    const pos = this.particles.geometry.attributes.position
    this.buttom = true
    this.data.ease = 0.01
  }

  onMouseUp() {
    this.buttom = false
    this.data.ease = 0.05
  }

  onMouseMove() {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  render(level) {
    const time = ((0.001 * performance.now()) % 12) / 12
    const zigzagTime = (1 + Math.sin(time * 2 * Math.PI)) / 6

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const intersects = this.raycaster.intersectObject(this.planeArea)

    if (intersects.length > 0) {
      const pos = this.particles.geometry.attributes.position
      const copy = this.geometryCopy.attributes.position
      const coulors = this.particles.geometry.attributes.customColor
      const size = this.particles.geometry.attributes.size

      const mx = intersects[0].point.x
      const my = intersects[0].point.y
      const mz = intersects[0].point.z

      for (var i = 0, l = pos.count; i < l; i++) {
        const initX = copy.getX(i)
        const initY = copy.getY(i)
        const initZ = copy.getZ(i)

        let px = pos.getX(i)
        let py = pos.getY(i)
        let pz = pos.getZ(i)

        this.colorChange.setHSL(0.5, 1, 1)
        coulors.setXYZ(
          i,
          this.colorChange.r,
          this.colorChange.g,
          this.colorChange.b
        )
        coulors.needsUpdate = true

        size.array[i] = this.data.particleSize
        size.needsUpdate = true

        let dx = mx - px
        let dy = my - py
        const dz = mz - pz

        const mouseDistance = this.distance(mx, my, px, py)
        let d = (dx = mx - px) * dx + (dy = my - py) * dy
        const f = -this.data.area / d

        if (this.buttom) {
          const t = Math.atan2(dy, dx)
          px -= f * Math.cos(t)
          py -= f * Math.sin(t)

          this.colorChange.setHSL(0.5 + zigzagTime, 1.0, 0.5)
          coulors.setXYZ(
            i,
            this.colorChange.r,
            this.colorChange.g,
            this.colorChange.b
          )
          coulors.needsUpdate = true

          if (
            px > initX + 70 ||
            px < initX - 70 ||
            py > initY + 70 ||
            py < initY - 70
          ) {
            this.colorChange.setHSL(0.15, 1.0, 0.5)
            coulors.setXYZ(
              i,
              this.colorChange.r,
              this.colorChange.g,
              this.colorChange.b
            )
            coulors.needsUpdate = true
          }
        } else {
          if (mouseDistance < this.data.area) {
            if (i % 5 == 0) {
              const t = Math.atan2(dy, dx)
              px -= 0.03 * Math.cos(t)
              py -= 0.03 * Math.sin(t)

              this.colorChange.setHSL(0.15, 1.0, 0.5)
              coulors.setXYZ(
                i,
                this.colorChange.r,
                this.colorChange.g,
                this.colorChange.b
              )
              coulors.needsUpdate = true

              size.array[i] = this.data.particleSize / 1.2
              size.needsUpdate = true
            } else {
              const t = Math.atan2(dy, dx)
              px += f * Math.cos(t)
              py += f * Math.sin(t)

              pos.setXYZ(i, px, py, pz)
              pos.needsUpdate = true

              size.array[i] = this.data.particleSize * 1.3
              size.needsUpdate = true
            }

            if (
              px > initX + 10 ||
              px < initX - 10 ||
              py > initY + 10 ||
              py < initY - 10
            ) {
              this.colorChange.setHSL(0.15, 1.0, 0.5)
              coulors.setXYZ(
                i,
                this.colorChange.r,
                this.colorChange.g,
                this.colorChange.b
              )
              coulors.needsUpdate = true

              size.array[i] = this.data.particleSize / 1.8
              size.needsUpdate = true
            }
          }
        }

        px += (initX - px) * this.data.ease
        py += (initY - py) * this.data.ease
        pz += (initZ - pz) * this.data.ease

        pos.setXYZ(i, px, py, pz)
        pos.needsUpdate = true
      }
    }
  }

  createText() {
    let thePoints = []

    let shapes = this.font.generateShapes(this.data.text, this.data.textSize)
    let geometry = new THREE.ShapeGeometry(shapes)
    geometry.computeBoundingBox()

    const xMid =
      -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x)
    const yMid =
      (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2.85

    geometry.center()

    let holeShapes = []

    for (let q = 0; q < shapes.length; q++) {
      let shape = shapes[q]

      if (shape.holes && shape.holes.length > 0) {
        for (let j = 0; j < shape.holes.length; j++) {
          let hole = shape.holes[j]
          holeShapes.push(hole)
        }
      }
    }
    shapes.push.apply(shapes, holeShapes)

    let colors = []
    let sizes = []

    for (let x = 0; x < shapes.length; x++) {
      let shape = shapes[x]

      const amountPoints =
        shape.type == 'Path' ? this.data.amount / 2 : this.data.amount

      let points = shape.getSpacedPoints(amountPoints)

      points.forEach((element, z) => {
        const a = new THREE.Vector3(element.x, element.y, 0)
        thePoints.push(a)
        colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b)
        sizes.push(1)
      })
    }

    let geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints)
    geoParticles.translate(xMid, yMid, 0)

    geoParticles.setAttribute(
      'customColor',
      new THREE.Float32BufferAttribute(colors, 3)
    )
    geoParticles.setAttribute(
      'size',
      new THREE.Float32BufferAttribute(sizes, 1)
    )

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        pointTexture: { value: this.particleImg },
      },
      vertexShader: document.getElementById('vertexshader').textContent,
      fragmentShader: document.getElementById('fragmentshader').textContent,

      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    })

    this.particles = new THREE.Points(geoParticles, material)
    this.scene.add(this.particles)

    this.geometryCopy = new THREE.BufferGeometry()
    this.geometryCopy.copy(this.particles.geometry)
  }

  visibleHeightAtZDepth(depth, camera) {
    const cameraOffset = camera.position.z
    if (depth < cameraOffset) depth -= cameraOffset
    else depth += cameraOffset

    const vFOV = (camera.fov * Math.PI) / 180

    return 2 * Math.tan(vFOV / 2) * Math.abs(depth)
  }

  visibleWidthAtZDepth(depth, camera) {
    const height = this.visibleHeightAtZDepth(depth, camera)
    return height * camera.aspect
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
  }
}
