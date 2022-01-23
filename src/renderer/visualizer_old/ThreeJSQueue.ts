import LoadQueue from './LoadQueue'
import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import helvetiker from './fonts/helvetiker_regular.typeface.json'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Skew } from '../../engine/oscillator'

interface ThreeJSBase_t {
  scene: THREE.Scene
  renderer: THREE.Renderer
  camera: THREE.Camera

  assets?: Assets_t
}

type Assets_t = Text_t | Cube_t
interface Text_t {
  type: 'text'
  geometry: THREE.BoxGeometry
  material: THREE.Material
  mesh: THREE.Mesh
}
interface Cube_t {
  type: 'cube'
  geometry: THREE.BoxGeometry
  material: THREE.Material
  mesh: THREE.Mesh
}

const threeJSQueue = new LoadQueue<ThreeJSBase_t>(() => {
  return {
    scene: new THREE.Scene(),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    camera: new THREE.PerspectiveCamera(70, 16 / 9, 0.01, 100),
  }
})

export function resize(width: number, height: number) {
  threeJSQueue.items.forEach((three) => {
    three.camera = new THREE.PerspectiveCamera(70, width / height, 0.001, 1000)
    three.camera.position.z = 5

    three.renderer.setSize(width, height)
  })
}

export function setCamZ(amount: number) {
  threeJSQueue.items.forEach((three) => {
    const newZ = Skew(amount, 0.6) * 1000
    three.camera.position.z = newZ
  })
}

export function scale(multiple: number) {
  threeJSQueue.getActive().scene.scale.multiplyScalar(multiple)
}

export function zoom(multiple: number) {}

const materials = {
  x: new THREE.LineBasicMaterial({ color: 0x0000ff }),
  y: new THREE.LineBasicMaterial({ color: 0x00ff00 }),
  z: new THREE.LineBasicMaterial({ color: 0xff0000 }),
}

export function translate(x: number, y: number) {
  const cam = threeJSQueue.getActive().camera
  threeJSQueue.getActive().scene.translateX(x)
  threeJSQueue.getActive().scene.translateY(y)
}

export function rotate(x: number, y: number) {
  threeJSQueue.getActive().scene.rotateX(x)
  threeJSQueue.getActive().scene.rotateY(y)
}

export function getNext() {
  threeJSQueue.next()
  return threeJSQueue.getActive()
}

export function update({ time, outputParams }: RealtimeState) {
  const active = threeJSQueue.getActive()

  if (active.assets && active.assets.type === 'cube') {
    const { x, y, width, height } = outputParams

    active.assets.mesh.rotation.x += 0.001 * time.dt
    active.assets.mesh.rotation.y += 0.002 * time.dt

    active.assets.mesh.scale.setScalar(width * 3)
    active.assets.mesh.position.setX(x - 0.5)
    active.assets.mesh.position.setY(y - 0.5)
    // active.assets.mesh.material.transparent = true
    // active.assets.mesh.material.opacity = Brightness
  } else if (active.assets && active.assets.type === 'text') {
  }

  active.renderer.render(active.scene, active.camera)
}

export function loadModel(path: string) {
  const bg = threeJSQueue.getBackground()
  const loader = new GLTFLoader()
  loader.load(
    `file://${path}`,
    (gltf) => {
      bg.scene.clear()
      bg.scene.add(gltf.scene)
    },
    undefined,
    (err) => {
      console.log(err)
    }
  )
}

export function loadText(text: string) {
  console.log(helvetiker)

  // const loader = new THREE.FontLoader()

  // loader.load(helvetiker, function (font) {
  //   const geometry = new THREE.TextGeometry(text, {
  //     font: font,
  //     size: 0.1,
  //     height: 0.01,
  //     curveSegments: 12,
  //     bevelEnabled: false,
  //     bevelThickness: 10,
  //     bevelSize: 8,
  //     bevelOffset: 0,
  //     bevelSegments: 5,
  //   })

  //   geometry.computeBoundingBox()
  //   console.log(geometry.boundingBox)
  //   geometry.center()

  //   const bg = threeJSQueue.getBackground()
  //   const material = new THREE.MeshNormalMaterial()
  //   const mesh = new THREE.Mesh(geometry, material)

  //   bg.scene.clear()
  //   bg.assets = undefined
  //   bg.assets = {
  //     type: 'text',
  //     geometry: geometry,
  //     material: material,
  //     mesh: mesh,
  //   }

  //   bg.scene.add(mesh)
  // })
}

export function loadCube() {
  const bg = threeJSQueue.getBackground()
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshNormalMaterial()
  const mesh = new THREE.Mesh(geometry, material)

  bg.scene.clear()
  bg.assets = undefined
  bg.assets = {
    type: 'cube',
    geometry: geometry,
    material: material,
    mesh: mesh,
  }

  bg.scene.add(mesh)
}
