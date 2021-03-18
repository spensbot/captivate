import LoadQueue from './LoadQueue'
import * as THREE from 'three'
import { RealtimeState } from '../../redux/realtimeStore'

interface ThreeJSBase_t {
  scene: THREE.Scene
  renderer: THREE.Renderer
  camera: THREE.Camera

  assets?: Assets_t
}

type Assets_t = Text_t | Cube_t
interface Text_t {
  type: 'text'
  text: string
}
interface Cube_t {
  type: 'cube'
  geometry: THREE.Geometry
  material: THREE.Material
  mesh: THREE.Mesh
}

const threeJSQueue = new LoadQueue<ThreeJSBase_t>(() => {
  return {
    scene: new THREE.Scene(),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    camera: new THREE.PerspectiveCamera(70, 16 / 9, 0.01, 100)
  }
})

export function resize(width: number, height: number) {
  threeJSQueue.items.forEach(three => {
    three.camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 100 );
    three.camera.position.z = 1;
  
    three.renderer.setSize( width, height );
  })
}

export function getNext() {
  threeJSQueue.next()
  return threeJSQueue.getActive()
}

export function update({ time, outputParams }: RealtimeState) {
  const active = threeJSQueue.getActive()
  if (active.assets && active.assets.type === 'cube') {
    const {X, Y, Width, Brightness} = outputParams

    active.assets.mesh.rotation.x += 0.001 * time.dt
    active.assets.mesh.rotation.y += 0.002 * time.dt

    active.assets.mesh.scale.setScalar(Width * 3)
    active.assets.mesh.position.setX(X - 0.5)
    active.assets.mesh.position.setY(Y - 0.5)
    active.assets.mesh.material.transparent = true
    active.assets.mesh.material.opacity = Brightness

    active.renderer.render(active.scene, active.camera)
  }
}

export function loadCube() {
  const bg = threeJSQueue.getBackground()
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshNormalMaterial()
  const mesh = new THREE.Mesh( geometry, material )

  bg.scene.clear()

  bg.assets = {
    type: 'cube',
    geometry: geometry,
    material: material,
    mesh: mesh
  }

  bg.scene.add(mesh)
}