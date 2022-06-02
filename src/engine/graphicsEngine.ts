import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'

let camera: THREE.Camera
let scene: THREE.Scene
let renderer: THREE.Renderer
let geometry: THREE.Geometry
let material: THREE.Material
let mesh: THREE.Mesh

export function init() {
  scene = new THREE.Scene();

  initCube();

  renderer = new THREE.WebGLRenderer( { antialias: true } );
}

function initCube() {
  scene.clear()

  geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );
}

export function getDomElement() {
  return renderer.domElement
}

export function resize (width: number, height: number) {
  camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 100 );
  camera.position.z = 1;

  renderer.setSize( width, height );
}

export function update({ time, outputParams }: RealtimeState) {
  const {X, Y, Width, Brightness} = outputParams

  mesh.rotation.x += 0.001 * time.dt;
  mesh.rotation.y += 0.002 * time.dt;

  mesh.scale.setScalar(Width * 3);
  mesh.position.setX(X - 0.5)
  mesh.position.setY(Y - 0.5)
  mesh.material.transparent = true;
  mesh.material.opacity = Brightness;

  if (renderer && scene && camera ){
    renderer.render( scene, camera );
  }
}
